const { OpenAI } = require('openai');
const logger = require('../utils/logger');
require('dotenv').config();
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
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
    "prioridad": "alta | media | baja",
    "sugerencia_ot": {
        "descripcion": "Descripción detallada para una nueva orden de trabajo",
        "tipo": "Preventivo | Correctivo | Predictivo | Calibración",
        "tiempo_estimado": "Ej: 2 horas"
    },
    "analisis_detallado": "Breve explicación técnica de tu razonamiento"
}
`;
const analizarActivo = async (asset, history) => {
    try {
        logger.info(`Solicitando análisis de IA para activo: ${asset.id}`);
        const userPrompt = `Analiza el siguiente activo y su historial reciente: ACTIVO: ${JSON.stringify(asset, null, 2)} HISTORIAL DE ÓRDENES DE TRABAJO: ${JSON.stringify(history, null, 2)} Basado en esta información, detecta patrones de falla, sugiere el siguiente paso de mantenimiento y evalúa el riesgo actual.`;
        const response = await openai.chat.completions.create({
            model: "gpt-5.3",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        logger.error("Error en módulo AI Assistant:", error);
        throw new Error("No se pudo procesar el análisis de IA");
    }
};
const generarPlan = async (asset) => {
    try {
        const userPrompt = `Genera un plan de mantenimiento preventivo anual para el activo: ${asset.name} (${asset.model}).`;
        const response = await openai.chat.completions.create({
            model: "gpt-5.3",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
            response_format: { type: "json_object" },
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        logger.error("Error al generar plan con IA:", error);
        throw error;
    }
};
const chatMantenimiento = async (message, context = {}) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-5.3",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: `Contexto actual: ${JSON.stringify(context)}. Pregunta: ${message}` }],
            response_format: { type: "json_object" },
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        logger.error("Error en chat de mantenimiento IA:", error);
        throw error;
    }
};
module.exports = { analizarActivo, generarPlan, chatMantenimiento };
