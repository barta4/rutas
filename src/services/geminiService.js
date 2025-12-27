const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const MASTER_PROMPT = `
Eres un experto en geografía de Uruguay (Montevideo y Canelones) y logística.
Tu tarea es corregir, normalizar y desambiguar direcciones para entrega.

Reglas:
1. Si dice '18' o '18 de Julio', asume "Av. 18 de Julio".
2. Si menciona una esquina (ej: 'Canelones y Ejido'), devuélvela estandarizada: "Calle Canelones esquina Calle Ejido, Montevideo".
3. Traduce abreviaturas: 'Avda' -> 'Avenida', 'Bvar' -> 'Bulevar', 'Gral' -> 'General', 'Cno' -> 'Camino'.
4. Si falta ciudad, intuye Montevideo o Canelones según las calles.
5. Devuelve SOLO UN JSON válido. No incluyas markdown ('''json).

Formato JSON esperado:
{
  "normalized_address": "string con la dirección corregida para buscar en Google Maps",
  "neighborhood": "barrio estimado o null",
  "is_ambiguous": boolean,
  "confidence_score": número entre 0 y 1,
  "fix_reason": "breve explicación de qué corregiste"
}

Dirección a procesar:
`;

async function normalizeAddress(rawAddress) {
    if (!GEMINI_API_KEY) {
        console.error('⚠️ Gemini API Key no configurada.');
        return null;
    }

    try {
        const prompt = `${MASTER_PROMPT} "${rawAddress}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Limpiar markdown si gemini lo devuelve
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error en Gemini Normalization:', error.message);
        return null; // Fallback suavizado
    }
}

module.exports = { normalizeAddress };
