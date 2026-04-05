require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const aiRoutes = require('./routes/aiRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🚀 SERVER INICIADO - VERSION DEBUG CORS");

// Log de requests entrantes para debug en producción
app.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.url);
    console.log("Origin:", req.headers.origin);
    next();
});

// FORZAR CORS MANUALMENTE (SIN LIBRERÍA) - ANTES DE TODAS LAS RUTAS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(morgan('dev'));

// Endpoint de salud actualizado para diagnóstico
app.get('/health', (req, res) => {
    res.json({ status: "ok", cors: "enabled" });
});

// Rutas de la API
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../')));

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    logger.info(`Servidor backend CMMS AI corriendo en puerto ${PORT}`);
    logger.info(`Modo: ${process.env.NODE_ENV}`);
});
