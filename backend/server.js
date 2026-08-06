require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');
const aiRoutes = require('./routes/aiRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');

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
const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:4175,http://127.0.0.1:4175')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean)
);

// Render también sirve el frontend como ruta de contingencia cuando Firebase
// Hosting no está accesible. Se autoriza siempre el mismo origen del servicio,
// aunque ALLOWED_ORIGINS haya sido configurado mediante una variable externa.
allowedOrigins.add('https://cmms-ai-backend.onrender.com');

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    } else if (origin) {
        return res.status(403).json({ error: 'Origen no autorizado' });
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
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
app.use('/api/auth', authRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../')));

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
    logger.info(`Servidor backend CMMS AI corriendo en puerto ${PORT}`);
    logger.info(`Modo: ${process.env.NODE_ENV}`);
});
