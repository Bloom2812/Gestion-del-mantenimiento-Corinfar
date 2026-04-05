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

// Configuración de CORS más explícita
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5500',
    /\.github\.io$/, // Permitir subdominios de github.io (GitHub Pages)
    /\.github\.dev$/ // Permitir entornos de GitHub Codespaces / Dev
];

app.use(cors({
    origin: function(origin, callback) {
        // Permitir peticiones sin origen (como apps móviles o curl)
        if (!origin) return callback(null, true);

        const isAllowed = allowedOrigins.some(pattern => {
            if (pattern instanceof RegExp) return pattern.test(origin);
            return pattern === origin;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            // Log for debugging CORS issues
            logger.warn(`CORS blocked for origin: ${origin}`);
            callback(null, true); // En desarrollo somos permisivos, pero avisamos
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../')));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});
app.listen(PORT, () => {
    logger.info(`Servidor backend CMMS AI corriendo en puerto ${PORT}`);
    logger.info(`Modo: ${process.env.NODE_ENV}`);
});
