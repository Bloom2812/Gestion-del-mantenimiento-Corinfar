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

console.log("CORS middleware cargado correctamente");

// Log para debug en cada request
app.use((req, res, next) => {
    console.log("Request origin:", req.headers.origin);
    next();
});

// FORZAR CORS GLOBAL (DEBUG MODE)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

// MANEJO EXPLÍCITO DE OPTIONS (CRÍTICO)
app.options("*", (req, res) => {
    res.sendStatus(200);
});

app.use(express.json());
app.use(morgan('dev'));

// Endpoint de salud
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
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
