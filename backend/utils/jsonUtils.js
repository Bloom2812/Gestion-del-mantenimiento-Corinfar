const logger = require('./logger');

const VALID_PRIORITIES = ["alta", "media", "baja"];

const safeParseJSON = (text) => {
    try {
        // Remove potential markdown code blocks if AI returns them
        const cleanText = text.replace(/```json\n?|```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (error) {
        logger.error(`[ai_error] Invalid JSON response: ${text.substring(0, 200)}...`, error);
        return null;
    }
};

const normalizeAIResponse = (data) => {
    const defaultResponse = {
        analisis: "No se proporcionó análisis detallado.",
        problemas: [],
        acciones: [],
        prioridad: "media",
        sugerencia_ot: {
            descripcion: "",
            tipo: "",
            tiempo_estimado: "",
            pasos: []
        }
    };

    if (!data || typeof data !== 'object') return defaultResponse;

    // Ensure mandatory fields exist
    const normalized = {
        analisis: data.analisis || data.analisis_detallado || defaultResponse.analisis,
        problemas: Array.isArray(data.problemas) ? data.problemas : defaultResponse.problemas,
        acciones: Array.isArray(data.acciones) ? data.acciones : defaultResponse.acciones,
        prioridad: VALID_PRIORITIES.includes(String(data.prioridad).toLowerCase())
            ? String(data.prioridad).toLowerCase()
            : defaultResponse.prioridad,
        sugerencia_ot: (data.sugerencia_ot && typeof data.sugerencia_ot === 'object')
            ? {
                descripcion: String(data.sugerencia_ot.descripcion || ""),
                tipo: String(data.sugerencia_ot.tipo || ""),
                tiempo_estimado: String(data.sugerencia_ot.tiempo_estimado || ""),
                pasos: Array.isArray(data.sugerencia_ot.pasos) ? data.sugerencia_ot.pasos : []
            }
            : defaultResponse.sugerencia_ot
    };

    return normalized;
};

module.exports = {
    safeParseJSON,
    normalizeAIResponse
};
