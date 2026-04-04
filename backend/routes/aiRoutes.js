const express = require('express');
const router = express.Router();
const aiAssistant = require('../ai/aiAssistant');
const assetService = require('../services/assetService');
const woService = require('../services/woService');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/authMiddleware');
router.post('/analizar-activo', authMiddleware, async (req, res) => {
    try {
        const { assetId } = req.body;
        if (!assetId) return res.status(400).json({ error: 'assetId es requerido' });
        const asset = await assetService.getActivo(assetId);
        if (!asset) return res.status(404).json({ error: 'Activo no encontrado' });
        const history = await woService.getOrdenes(assetId);
        const result = await aiAssistant.analizarActivo(asset, history);
        res.json(result);
    } catch (error) {
        logger.error('Error en /analizar-activo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/generar-plan', authMiddleware, async (req, res) => {
    try {
        const { assetId } = req.body;
        if (!assetId) return res.status(400).json({ error: 'assetId es requerido' });
        const asset = await assetService.getActivo(assetId);
        if (!asset) return res.status(404).json({ error: 'Activo no encontrado' });
        const result = await aiAssistant.generarPlan(asset);
        res.json(result);
    } catch (error) {
        logger.error('Error en /generar-plan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) return res.status(400).json({ error: 'mensaje es requerido' });
        const result = await aiAssistant.chatMantenimiento(message, context);
        res.json(result);
    } catch (error) {
        logger.error('Error en /chat:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
module.exports = router;
