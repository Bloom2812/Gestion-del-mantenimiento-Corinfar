const logger = require('./logger');

const VALID_PRIORITIES = ["alta", "media", "baja"];

const safeParseJSON = (text) => {
    if (!text || typeof text !== 'string') return null;

    try {
        // Extract the first JSON object block using regex
        const jsonMatch = text.match(/{[\s\S]*}/);
        if (!jsonMatch) {
            logger.error(`[ai_error] No se encontró bloque JSON en la respuesta: ${text.substring(0, 200)}...`);
            return null;
        }

        const cleanText = jsonMatch[0].trim();
        return JSON.parse(cleanText);
    } catch (error) {
        logger.error(`[ai_error] Error al parsear JSON: ${error.message}. Texto: ${text.substring(0, 200)}...`);
        return null;
    }
};

const isValidAIResponse = (data) => {
    return !!(
        data &&
        typeof data.analisis === "string" &&
        Array.isArray(data.problemas) &&
        Array.isArray(data.acciones) &&
        data.sugerencia_ot &&
        typeof data.sugerencia_ot === "object"
    );
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
    isValidAIResponse,
    normalizeAIResponse
};
