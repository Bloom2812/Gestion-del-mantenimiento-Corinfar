const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CONFIG_PATH = path.join(__dirname, '../config/ai-config.json');
const USAGE_PATH = path.join(__dirname, '../data/ai-usage.json');

// Constant based on Gemini 1.5 Flash standard pricing
// $0.075 / 1M input tokens, $0.30 / 1M output tokens (approximate avg $0.15 - $0.20)
// The user suggested 0.35 in their example.
const COST_PER_MILLION_TOKENS = 0.35;

class AISettingsService {
    constructor() {
        this.config = this._loadJSON(CONFIG_PATH, { apiKey: "", provider: "gemini", monthlyBudget: 30 });
        this.usage = this._loadJSON(USAGE_PATH, { monthly: {} });
    }

    _loadJSON(filePath, defaultValue) {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (error) {
            logger.error(`Error loading JSON from ${filePath}:`, error);
        }
        return defaultValue;
    }

    _saveJSON(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            logger.error(`Error saving JSON to ${filePath}:`, error);
            return false;
        }
    }

    getConfig() {
        return { ...this.config };
    }

    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this._saveJSON(CONFIG_PATH, this.config);
    }

    getApiKey() {
        // Preference: Env Var > Config file (standard for cloud deployments like Render)
        // Also check if the key in config is a placeholder
        const configKey = this.config.apiKey;
        const envKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

        if (envKey) return envKey;
        if (configKey && !configKey.includes("AIzaTest")) return configKey;

        return configKey || null;
    }

    getUsage() {
        const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
        const monthlyData = this.usage.monthly[currentMonth] || { tokens: 0, requests: 0, estimated_cost: 0, daily: {} };

        return {
            ...monthlyData,
            limit: this.config.monthlyBudget || 30,
            usage_percentage: (monthlyData.estimated_cost / (this.config.monthlyBudget || 30)) * 100
        };
    }

    trackUsage(tokens) {
        const now = new Date().toISOString();
        const currentMonth = now.substring(0, 7); // YYYY-MM
        const today = now.substring(0, 10); // YYYY-MM-DD

        if (!this.usage.monthly[currentMonth]) {
            this.usage.monthly[currentMonth] = { tokens: 0, requests: 0, estimated_cost: 0, daily: {} };
        }

        const monthData = this.usage.monthly[currentMonth];
        monthData.tokens += tokens;
        monthData.requests += 1;
        monthData.estimated_cost = (monthData.tokens / 1000000) * COST_PER_MILLION_TOKENS;

        if (!monthData.daily[today]) {
            monthData.daily[today] = { tokens: 0, requests: 0 };
        }

        monthData.daily[today].tokens += tokens;
        monthData.daily[today].requests += 1;

        this._saveJSON(USAGE_PATH, this.usage);

        logger.info(`[ai_usage_tracked] Month: ${currentMonth}, Day: ${today}, Tokens: ${tokens}`);
    }
}

module.exports = new AISettingsService();
