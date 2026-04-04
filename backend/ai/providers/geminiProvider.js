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
            this.model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    maxOutputTokens: 400,
                    temperature: 0.7,
                    responseMimeType: "application/json"
                }
            });
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

        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }]
                }]
            });

            const response = await result.response;
            const text = response.text();

            // Track usage
            if (result.usageMetadata) {
                const totalTokens = result.usageMetadata.totalTokenCount;
                aiSettingsService.trackUsage(totalTokens);
                logger.info(`[ai_usage] Total tokens: ${totalTokens}, Prompt: ${result.usageMetadata.promptTokenCount}, Completion: ${result.usageMetadata.candidatesTokenCount}`);
            }

            return text;
        } catch (error) {
            logger.error('[ai_error] Gemini call failed:', error);
            throw error;
        }
    }
}

module.exports = new GeminiProvider();
