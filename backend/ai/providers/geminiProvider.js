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

        // Definimos combinaciones de modelo y versión de API a probar (priorizando -latest según requerimiento)
        const combinations = [
            { model: "gemini-1.5-flash-latest", version: "v1beta", useMime: true },
            { model: "gemini-1.5-pro-latest", version: "v1beta", useMime: true },
            { model: "gemini-1.5-flash", version: "v1beta", useMime: true },
            { model: "gemini-1.5-pro", version: "v1beta", useMime: true },
            { model: "gemini-1.5-flash", version: "v1", useMime: true },
            { model: "gemini-1.5-pro", version: "v1", useMime: true }
        ];

        let lastError = null;

        for (const combo of combinations) {
            try {
                console.log(`Intentando modelo: ${combo.model} (${combo.version}, MIME: ${combo.useMime})`);

                const generationConfig = {
                    maxOutputTokens: 400,
                    temperature: 0.7
                };

                if (combo.useMime) {
                    generationConfig.responseMimeType = "application/json";
                }

                const model = this.genAI.getGenerativeModel(
                    {
                        model: combo.model,
                        generationConfig
                    },
                    { apiVersion: combo.version }
                );

                const result = await model.generateContent({
                    contents: [{
                        role: "user",
                        parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }]
                    }]
                });

                const response = await result.response;
                const text = response.text();
                console.log(`Respuesta Gemini OK con modelo ${combo.model}`);

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

                logger.error(`[ai_error] Fallo con modelo ${combo.model} (${combo.version}):`, error.message);

                // Si el error es por "responseMimeType" no soportado, intentamos la misma versión sin esa opción
                if (combo.useMime && error.message && error.message.includes("responseMimeType")) {
                    console.log(`Reintentando ${combo.model} sin responseMimeType...`);
                    combo.useMime = false;
                    // Retrocedemos el puntero para repetir este combo modificado
                    combinations.splice(combinations.indexOf(combo) + 1, 0, { ...combo, useMime: false });
                }
            }
        }

        logger.error('[ai_error] Todos los intentos de Gemini fallaron');
        throw lastError;
    }
}

module.exports = new GeminiProvider();
