const AIProviderFactory = require('./providers/aiFactory');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { safeParseJSON, normalizeAIResponse } = require('../utils/jsonUtils');
require('dotenv').config();

const provider = AIProviderFactory.getProvider('gemini');

const SYSTEM_PROMPT = `
Actúa como un experto senior en mantenimiento industrial y sistemas CMMS.
Tu objetivo es analizar activos y sus historiales de mantenimiento para proporcionar recomendaciones precisas.
REGLAS CRÍTICAS:
1. Siempre debes responder en formato JSON válido.
2. Si los datos están incompletos, indica las suposiciones basadas en mejores prácticas industriales.
3. No ejecutes acciones, solo sugiere.
4. Usa un tono profesional y técnico.
FORMATO DE RESPUESTA OBLIGATORIO (JSON):
{
    "problemas": ["lista de problemas potenciales detectados"],
    "acciones": ["lista de acciones recomendadas"],
    "prioridad": "ALTA | MEDIA | BAJA",
    "sugerencia_ot": {
        "descripcion": "Descripción detallada para una nueva orden de trabajo",
        "tipo": "Preventivo | Correctivo | Predictivo | Calibración",
        "tiempo_estimado": "Ej: 2 horas"
    },
    "analisis_detallado": "Breve explicación técnica de tu razonamiento"
}
`;

const FALLBACK_RESPONSE = {
    "problemas": ["No se pudo analizar el activo"],
    "acciones": ["Intentar nuevamente"],
    "prioridad": "MEDIA",
    "sugerencia_ot": null,
    "analisis_detallado": "Error en servicio de IA"
};

/**
 * Reduce history to a maximum of 5 records
 */
const reduceHistory = (history) => {
    if (!Array.isArray(history)) return [];
    return history.slice(-5).map(o => ({
        tipo: o.tipo || "N/A",
        falla: o.falla || "N/A",
        fecha: o.fecha || "N/A"
    }));
};

const analizarActivo = async (asset, history) => {
    try {
        const assetId = asset.id;

        // Check Cache
        const cachedResult = cache.get(assetId);
        if (cachedResult) {
            logger.info(`[ai_cache_hit] Returning cached analysis for asset: ${assetId}`);
            return cachedResult;
        }

        logger.info(`Solicitando análisis de IA para activo: ${assetId}`);

        // Context reduction
        const reducedHistory = reduceHistory(history);

        const userPrompt = `Analiza el siguiente activo y su historial reciente:
        ACTIVO: ${JSON.stringify(asset, null, 2)}
        HISTORIAL DE ÓRDENES DE TRABAJO (últimos 5): ${JSON.stringify(reducedHistory, null, 2)}
        Basado en esta información, detecta patrones de falla, sugiere el siguiente paso de mantenimiento y evalúa el riesgo actual.`;

        const responseText = await provider.generateContent(SYSTEM_PROMPT, userPrompt);
        const parsed = safeParseJSON(responseText);
        const normalized = normalizeAIResponse(parsed);

        // Store in Cache
        cache.set(assetId, normalized);

        return normalized;
    } catch (error) {
        logger.error("[ai_error] Error en analizarActivo:", error);
        return FALLBACK_RESPONSE;
    }
};

const generarPlan = async (asset) => {
    try {
        const cacheKey = `plan_${asset.id}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const userPrompt = `Genera un plan de mantenimiento preventivo anual estructurado para el activo: ${asset.name} (${asset.model}).`;

        const responseText = await provider.generateContent(SYSTEM_PROMPT, userPrompt);
        const parsed = safeParseJSON(responseText);
        const normalized = normalizeAIResponse(parsed);

        cache.set(cacheKey, normalized);
        return normalized;
    } catch (error) {
        logger.error("[ai_error] Error al generar plan con IA:", error);
        return FALLBACK_RESPONSE;
    }
};

const chatMantenimiento = async (message, context = {}) => {
    try {
        // Simple context reduction/trimming
        const trimmedContext = JSON.stringify(context).substring(0, 1000); // Limit context size

        const userPrompt = `Contexto actual (resumido): ${trimmedContext}. Pregunta del usuario: ${message}`;

        const responseText = await provider.generateContent(SYSTEM_PROMPT, userPrompt);
        const parsed = safeParseJSON(responseText);
        return normalizeAIResponse(parsed);
    } catch (error) {
        logger.error("[ai_error] Error en chat de mantenimiento IA:", error);
        return FALLBACK_RESPONSE;
    }
};

module.exports = { analizarActivo, generarPlan, chatMantenimiento };
