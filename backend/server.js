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

// Log para debug en producción
app.use((req, res, next) => {
    console.log("Origin:", req.headers.origin);
    next();
});

// Configuración simple y funcional de CORS
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://bloom2812.github.io"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Manejo global de OPTIONS (preflight)
app.options("*", cors());

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
