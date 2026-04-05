const express = require('express');
const router = express.Router();
const aiSettingsService = require('../services/aiSettingsService');
const aiAssistant = require('../ai/aiAssistant');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/authMiddleware');

// Get AI Config (masked key)
router.get('/ai-config', authMiddleware, (req, res) => {
    try {
        const config = aiSettingsService.getConfig();
        // Mask the API Key for security
        if (config.apiKey && config.apiKey.length > 8) {
            config.apiKey = config.apiKey.substring(0, 4) + '...' + config.apiKey.substring(config.apiKey.length - 4);
        } else if (config.apiKey) {
            config.apiKey = '****';
        }
        res.json(config);
    } catch (error) {
        logger.error('Error in GET /ai-config:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update AI Config
router.post('/ai-config', authMiddleware, (req, res) => {
    try {
        const { apiKey, monthlyBudget, provider } = req.body;

        const newConfig = {};

        // Prevent saving masked keys (bug fix)
        if (apiKey !== undefined && apiKey !== '' && !apiKey.includes('...') && apiKey !== '****') {
            newConfig.apiKey = apiKey;
        }

        if (monthlyBudget !== undefined) newConfig.monthlyBudget = parseFloat(monthlyBudget);
        if (provider !== undefined) newConfig.provider = provider;

        const success = aiSettingsService.saveConfig(newConfig);
        if (success) {
            res.json({ message: 'Configuración guardada exitosamente' });
        } else {
            res.status(500).json({ error: 'Error al guardar configuración' });
        }
    } catch (error) {
        logger.error('Error in POST /ai-config:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get AI Usage
router.get('/ai-usage', authMiddleware, (req, res) => {
    try {
        const usage = aiSettingsService.getUsage();
        res.json(usage);
    } catch (error) {
        logger.error('Error in GET /ai-usage:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Test Connection
router.post('/ai-test-connection', authMiddleware, async (req, res) => {
    try {
        const startTime = Date.now();
        // Custom prompt for testing
        const result = await aiAssistant.chatMantenimiento("Responde únicamente: OK", { test: true });
        const duration = Date.now() - startTime;

        res.json({
            status: 'connected',
            duration: `${duration}ms`,
            response: result
        });
    } catch (error) {
        logger.error('Error in POST /ai-test-connection:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
