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

        const modelsToTry = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest"];
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                console.log("Modelo usado:", modelName);
                const model = this.genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        maxOutputTokens: 400,
                        temperature: 0.7,
                        responseMimeType: "application/json"
                    }
                });

                const result = await model.generateContent({
                    contents: [{
                        role: "user",
                        parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }]
                    }]
                });

                const response = await result.response;
                const text = response.text();
                console.log("Respuesta Gemini OK");

                // Track usage
                if (result.usageMetadata) {
                    const totalTokens = result.usageMetadata.totalTokenCount;
                    aiSettingsService.trackUsage(totalTokens);
                    logger.info(`[ai_usage] Total tokens: ${totalTokens}, Prompt: ${result.usageMetadata.promptTokenCount}, Completion: ${result.usageMetadata.candidatesTokenCount}`);
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

                logger.error(`[ai_error] Fallo con modelo ${modelName}, intentando fallback si está disponible:`, error.message);
            }
        }

        logger.error('[ai_error] Todos los modelos de Gemini fallaron');
        throw lastError;
    }
}

module.exports = new GeminiProvider();
