const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');
require('dotenv').config();

class GeminiProvider {
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY; // Fallback to OpenAI key if Gemini not present
        if (!apiKey) {
            logger.error('[ai_error] No API key found for AI Provider');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                maxOutputTokens: 400,
                temperature: 0.7,
                responseMimeType: "application/json"
            }
        });
    }

    async generateContent(systemPrompt, userPrompt) {
        try {
            const result = await this.model.generateContent({
                contents: [{
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\nUser request: ${userPrompt}` }]
                }]
            });

            const response = await result.response;
            const text = response.text();

            // Log token usage (Gemini SDK reports usage metadata in the result)
            if (result.usageMetadata) {
                logger.info(`[ai_usage] Total tokens: ${result.usageMetadata.totalTokenCount}, Prompt: ${result.usageMetadata.promptTokenCount}, Completion: ${result.usageMetadata.candidatesTokenCount}`);
            }

            return text;
        } catch (error) {
            logger.error('[ai_error] Gemini call failed:', error);
            throw error;
        }
    }
}

module.exports = new GeminiProvider();
