require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const aiRoutes = require('./routes/aiRoutes');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/api/ai', aiRoutes);
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
