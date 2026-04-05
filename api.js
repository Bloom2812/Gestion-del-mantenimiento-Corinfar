// Detectar si estamos en local, sandbox o producción
const isLocal = window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1" ||
                window.location.hostname.includes("preview.app.github.dev") ||
                window.location.hostname.includes("github.dev");

export const API_BASE_URL = isLocal
    ? (window.location.port === "3000" ? "" : "http://localhost:3000")
    : "https://cmms-ai-backend.onrender.com"; // URL por defecto para producción (GitHub Pages -> Render)

export async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
        },
        ...options,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: `HTTP ${response.status}` };
        }
        throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    return response.json();
}
