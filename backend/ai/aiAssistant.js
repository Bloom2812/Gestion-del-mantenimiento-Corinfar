const AIProviderFactory = require('./providers/aiFactory');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { safeParseJSON, normalizeAIResponse } = require('../utils/jsonUtils');
require('dotenv').config();

const provider = AIProviderFactory.getProvider('gemini');

const SYSTEM_PROMPT = `
Actúa como un Ingeniero de Mantenimiento Industrial experto en confiabilidad (RCM) y gestión de activos.
Tu objetivo NO es responder de forma genérica. Debes analizar activos industriales como un experto real.

TAREAS:
1. ANALIZAR EL ACTIVO: Identificar posibles fallas, detectar patrones en historial y evaluar criticidad.
2. DETECTAR PROBLEMAS REALES: Evitar respuestas genéricas. Ej: desgaste de componentes, sobreuso, fallas repetitivas.
3. PROPONER ACCIONES TÉCNICAS: Acciones claras como inspección específica, cambio de pieza, ajuste, lubricación, calibración.
4. PRIORIZAR: ALTA (riesgo operativo/paro), MEDIA (degradación), BAJA (mejora preventiva).
5. GENERAR ORDEN DE TRABAJO: Descripción técnica clara, tipo, pasos sugeridos y tiempo estimado realista.

REGLAS CRÍTICAS:
1. Siempre debes responder en formato JSON válido.
2. NUNCA responder "no se pudo analizar" o dejar campos vacíos.
3. Si los datos están incompletos, realiza inferencias técnicas fundamentadas según el tipo de equipo e industria.
4. Pensar como experto industrial RCM, no como chatbot. Generar valor técnico real para los técnicos en campo.

FORMATO DE RESPUESTA OBLIGATORIO (JSON):
{
    "analisis": "Explicación técnica detallada del razonamiento RCM",
    "problemas": ["Problema técnico 1", "Problema técnico 2"],
    "acciones": ["Acción técnica 1", "Acción técnica 2"],
    "prioridad": "alta | media | baja",
    "sugerencia_ot": {
        "descripcion": "Descripción técnica detallada de la tarea",
        "tipo": "Preventivo | Correctivo | Predictivo | Calibración | Emergencia",
        "tiempo_estimado": "Ej: 2.5 horas",
        "pasos": ["Paso técnico 1", "Paso técnico 2"]
    }
}
`;

const FALLBACK_RESPONSE = {
    "analisis": "No se pudo consultar el servicio de IA, pero se genera análisis básico.",
    "problemas": ["Sin análisis avanzado disponible"],
    "acciones": ["Revisar manualmente el activo"],
    "prioridad": "media",
    "sugerencia_ot": {
        "descripcion": "Inspección general del equipo",
        "tipo": "Preventivo",
        "tiempo_estimado": "1h",
        "pasos": ["Inspección visual", "Verificar componentes críticos"]
    }
};

/**
 * Reduce history to a maximum of 5 records
 */
const reduceHistory = (history) => {
    if (!Array.isArray(history)) return [];
    return history.slice(-5).map(o => ({
        tipo: o.tipo || "N/A",
        falla: o.falla || "N/A",
        fecha: o.fecha || "N/A",
        descripcion: o.description || ""
    }));
};

const analizarActivo = async (asset, history) => {
    try {
        const assetId = asset.id || "unknown";

        // Check Cache
        const cachedResult = cache.get(assetId);
        if (cachedResult) {
            logger.info(`[ai_cache_hit] Returning cached analysis for asset: ${assetId}`);
            return cachedResult;
        }

        logger.info(`Solicitando análisis de IA para activo: ${assetId}`);

        // Context reduction
        const reducedHistory = reduceHistory(history);

        const userPrompt = `Analiza el siguiente activo y su historial reciente en un contexto industrial:
        ACTIVO: ${JSON.stringify(asset, null, 2)}
        HISTORIAL DE ÓRDENES DE TRABAJO (últimos 5): ${JSON.stringify(reducedHistory, null, 2)}
        Basado en esta información, detecta patrones de falla, sugiere el siguiente paso de mantenimiento y evalúa el riesgo actual.`;

        const responseText = await provider.generateContent(SYSTEM_PROMPT, userPrompt);
        const parsed = safeParseJSON(responseText);

        if (!parsed) {
            logger.error(`[ai_error] Error de IA: El modelo no devolvió JSON válido para activo ${assetId}`);
            return normalizeAIResponse(null); // This uses default fallback from normalizeAIResponse which matches our requirements
        }

        const normalized = normalizeAIResponse(parsed);

        // Store in Cache
        cache.set(assetId, normalized);

        return normalized;
    } catch (error) {
        logger.error(`[ai_error] Error técnico en analizarActivo para activo ${asset.id || 'desconocido'}:`, error);
        return FALLBACK_RESPONSE;
    }
};

const generarPlan = async (asset, history) => {
    try {
        const cacheKey = `plan_${asset.id || "unknown"}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached;

        const reducedHistory = reduceHistory(history);
        const userPrompt = `Genera un plan de mantenimiento preventivo anual estructurado para el activo: ${JSON.stringify(asset, null, 2)}.
        Toma en cuenta el historial reciente: ${JSON.stringify(reducedHistory, null, 2)}`;

        const responseText = await provider.generateContent(SYSTEM_PROMPT, userPrompt);
        const parsed = safeParseJSON(responseText);

        if (!parsed) {
            logger.error(`[ai_error] Error de IA al generar plan: El modelo no devolvió JSON válido para activo ${asset.id || 'desconocido'}`);
            return normalizeAIResponse(null);
        }

        const normalized = normalizeAIResponse(parsed);

        cache.set(cacheKey, normalized);
        return normalized;
    } catch (error) {
        logger.error(`[ai_error] Error técnico al generar plan para activo ${asset.id || 'desconocido'}:`, error);
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

        if (!parsed) {
            logger.error("[ai_error] Error de IA en chat: El modelo no devolvió JSON válido");
            return normalizeAIResponse(null);
        }

        return normalizeAIResponse(parsed);
    } catch (error) {
        logger.error("[ai_error] Error técnico en chat de mantenimiento IA:", error);
        return FALLBACK_RESPONSE;
    }
};

module.exports = { analizarActivo, generarPlan, chatMantenimiento };
