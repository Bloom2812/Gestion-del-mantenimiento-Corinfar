const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');
const aiSettingsService = require('../../services/aiSettingsService');
require('dotenv').config();

class GeminiProvider {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.currentApiKey = null;
    }

    _init() {
        const apiKey = aiSettingsService.getApiKey();
        if (!apiKey) {
            logger.error('[ai_error] No API key found for AI Provider');
            return false;
        }

        if (this.genAI && this.currentApiKey === apiKey) {
            return true;
        }

        try {
            this.currentApiKey = apiKey;
            this.genAI = new GoogleGenerativeAI(apiKey);
            return true;
        } catch (error) {
            logger.error('[ai_error] Error initializing Gemini Provider:', error);
            return false;
        }
    }

    async generateContent(systemPrompt, userPrompt) {
        if (!this._init()) {
            throw new Error('AI Provider not initialized. Please check API Key.');
        }

        // Definimos modelos a probar en orden de prioridad (Producción)
        const models = [
            "gemini-2.5-flash",
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ];

        let lastError = null;
        let attempt = 0;

        for (const modelName of models) {
            attempt++;
            const startTime = Date.now();
            const isFallback = attempt > 1;

            try {
                // Usamos v1beta para soportar responseMimeType: application/json
                // El endpoint v1 suele dar error con responseMimeType
                const apiVersion = "v1beta";

                const generationConfig = {
                    maxOutputTokens: 400,
                    temperature: 0.7,
                    responseMimeType: "application/json"
                };

                const model = this.genAI.getGenerativeModel(
                    {
                        model: modelName,
                        generationConfig
                    },
                    { apiVersion: apiVersion }
                );

                const result = await model.generateContent({
                    contents: [{
                        role: "user",
                        parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }]
                    }]
                });

                const response = await result.response;
                const text = response.text();
                const responseTime = Date.now() - startTime;

                console.log("Modelo usado:", modelName);
                console.log("Fallback activado:", isFallback);
                console.log("Tiempo de respuesta:", `${responseTime}ms`);

                // Track usage
                if (result.usageMetadata) {
                    const totalTokens = result.usageMetadata.totalTokenCount;
                    const promptTokens = result.usageMetadata.promptTokenCount;
                    const candidatesTokens = result.usageMetadata.candidatesTokenCount;

                    aiSettingsService.trackUsage(totalTokens);
                    logger.info(`[ai_usage] Model: ${modelName}, Total: ${totalTokens} (P:${promptTokens}/C:${candidatesTokens}), Time: ${responseTime}ms, Fallback: ${isFallback}`);
                }

                return text;
            } catch (error) {
                lastError = error;

                // Diferenciar error de modelo vs API key
                const isApiKeyError = error.message && (
                    error.message.includes("API_KEY_INVALID") ||
                    error.message.includes("API key not valid") ||
                    error.status === 403 ||
                    (error.response && error.response.status === 403)
                );

                if (isApiKeyError) {
                    logger.error('[ai_error] Error crítico de API Key:', error.message);
                    throw new Error("Invalid Gemini API Key");
                }

                logger.error(`[ai_error] Fallo con modelo ${modelName} (v1beta):`, error.message);
            }
        }

        logger.error('[ai_error] Todos los intentos de Gemini fallaron');
        throw lastError || new Error("All Gemini models failed to respond");
    }
}

module.exports = new GeminiProvider();
