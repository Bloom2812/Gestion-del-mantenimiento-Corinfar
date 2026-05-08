const geminiProvider = require('./geminiProvider');
// Import future providers here

class AIProviderFactory {
    static getProvider(name = 'gemini') {
        switch (name.toLowerCase()) {
            case 'gemini':
                return geminiProvider;
            // case 'openai':
            //     return openaiProvider;
            default:
                return geminiProvider;
        }
    }
}

module.exports = AIProviderFactory;
