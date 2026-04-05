const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');
const aiSettingsService = require('../../services/aiSettingsService');
const { safeParseJSON, isValidAIResponse } = require('../../utils/jsonUtils');
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
                // Usamos v1 según requerimiento de producción
                const apiVersion = "v1";

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

                // Función interna para realizar la petición y validar
                const getAndValidate = async (customPrompt = null) => {
                    const finalPrompt = customPrompt || `${systemPrompt}\n\nUser request: ${userPrompt}`;

                    const result = await model.generateContent({
                        contents: [{
                            role: "user",
                            parts: [{ text: finalPrompt }]
                        }]
                    });

                    const response = await result.response;
                    const text = response.text();

                    // Log respuesta cruda
                    logger.info("Respuesta cruda IA", { responseText: text });

                    // Track usage
                    if (result.usageMetadata) {
                        const totalTokens = result.usageMetadata.totalTokenCount;
                        aiSettingsService.trackUsage(totalTokens);
                    }

                    const parsed = safeParseJSON(text);
                    if (parsed && isValidAIResponse(parsed)) {
                        return { text, parsed, usage: result.usageMetadata };
                    }
                    return { text, parsed: null, usage: result.usageMetadata };
                };

                // PRIMER INTENTO
                let validatedResult = await getAndValidate();

                // SMART RETRY: Si falla validación, reintentar con prompt reforzado
                if (!validatedResult.parsed) {
                    logger.warn(`[ai_retry] JSON inválido o incompleto con ${modelName}. Reintentando con prompt reforzado...`);

                    const reinforcedPrompt = `${systemPrompt}\n\nUser request: ${userPrompt}\n\nIMPORTANTE: Responde SOLO JSON válido, sin texto adicional, cumpliendo con la estructura solicitada.`;

                    validatedResult = await getAndValidate(reinforcedPrompt);
                }

                // Si después del reintento sigue siendo inválido, lanzamos error para que pase al siguiente modelo (fallback)
                if (!validatedResult.parsed) {
                    throw new Error(`JSON validation failed for model ${modelName} after retry`);
                }

                const responseTime = Date.now() - startTime;
                logger.info(`[ai_success] Model: ${modelName}, Time: ${responseTime}ms, Fallback: ${isFallback}`);

                return validatedResult.text;

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

                logger.error(`[ai_error] Fallo con modelo ${modelName} (v1):`, error.message);
            }
        }

        logger.error('[ai_error] Todos los intentos de Gemini fallaron');
        throw lastError || new Error("All Gemini models failed to respond");
    }
}

module.exports = new GeminiProvider();
