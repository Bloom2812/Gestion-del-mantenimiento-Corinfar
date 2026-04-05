const express = require('express');
const router = express.Router();
const aiAssistant = require('../ai/aiAssistant');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/authMiddleware');
router.post('/analizar-activo', authMiddleware, async (req, res) => {
    try {
        const { asset, historial } = req.body;

        if (!asset) {
            return res.status(400).json({ error: "Asset is required" });
        }

        const safeAsset = {
            id: asset.id || "unknown",
            name: asset.name || "Activo",
            status: asset.status || "Operativo",
            ...asset
        };

        const safeHistorial = historial || [];

        console.log("Asset recibido:", safeAsset.id);
        console.log("Historial length:", safeHistorial.length);

        const result = await aiAssistant.analizarActivo(safeAsset, safeHistorial);
        res.json(result);
    } catch (error) {
        logger.error('Error en /analizar-activo:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/generar-plan', authMiddleware, async (req, res) => {
    try {
        const { asset, historial } = req.body;

        if (!asset) {
            return res.status(400).json({ error: "Asset is required" });
        }

        const safeAsset = {
            id: asset.id || "unknown",
            name: asset.name || "Activo",
            status: asset.status || "Operativo",
            ...asset
        };

        const safeHistorial = historial || [];

        console.log("Asset recibido:", safeAsset.id);
        console.log("Historial length:", safeHistorial.length);

        const result = await aiAssistant.generarPlan(safeAsset, safeHistorial);
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
