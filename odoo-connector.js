/**
 * OdooConnector - Clase para manejar la conexión JSON-RPC con Odoo Online
 */
export class OdooConnector {
    constructor(url, db, username, apiKey, proxyUrl = null) {
        // Normalización básica de la URL
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        // Si el usuario incluyó /jsonrpc, lo quitamos para que _callRpc lo maneje uniformemente
        if (cleanUrl.endsWith('/jsonrpc')) cleanUrl = cleanUrl.slice(0, -8);
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

        this.url = cleanUrl;
        this.db = db;
        this.username = username;
        this.apiKey = apiKey;
        this.proxyUrl = proxyUrl;
        this.uid = null;
    }

    /**
     * Obtiene la versión del servidor Odoo
     */
    async version() {
        return this._callRpc('common', 'version', []);
    }

    /**
     * Autentica con Odoo para obtener el UID del usuario
     */
    async authenticate() {
        try {
            const response = await this._callRpc('common', 'authenticate', [
                this.db,
                this.username,
                this.apiKey,
                {}
            ]);

            // Si la respuesta es directamente el UID (formato Odoo estándar)
            if (typeof response === 'number') {
                this.uid = response;
                return this.uid;
            }

            // Si la respuesta es un objeto que contiene el UID (formato de algunos proxies personalizados)
            if (response && typeof response === 'object' && response.uid) {
                this.uid = response.uid;
                return this.uid;
            }

            // Si llegamos aquí, la respuesta no es válida
            throw new Error('Fallo en la autenticación: No se recibió un UID válido');
        } catch (error) {
            console.error("Error de Odoo Auth:", error);
            throw error;
        }
    }

    /**
     * Ejecuta una búsqueda en un modelo de Odoo
     */
    async searchRead(model, domain = [], fields = []) {
        return this.executeKw(model, 'search_read', [domain], { fields });
    }

    /**
     * Crea un nuevo registro en Odoo
     */
    async create(model, values) {
        return this.executeKw(model, 'create', [values]);
    }

    /**
     * Actualiza un registro existente
     */
    async write(model, id, values) {
        return this.executeKw(model, 'write', [[id], values]);
    }

    /**
     * Método genérico execute_kw para interactuar con modelos
     */
    async executeKw(model, method, args = [], kwargs = {}) {
        if (!this.uid) {
            await this.authenticate();
        }

        return this._callRpc('object', 'execute_kw', [
            this.db,
            this.uid,
            this.apiKey,
            model,
            method,
            args,
            kwargs
        ]);
    }

    /**
     * Realiza la llamada fetch JSON-RPC (directamente o vía proxy)
     */
    async _callRpc(service, method, args) {
        const odooEndpoint = `${this.url}/jsonrpc`;
        const rpcBody = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: service,
                method: method,
                args: args
            },
            id: Math.floor(Math.random() * 1000)
        };

        // Si hay un proxy configurado, enviamos la petición al proxy
        const endpoint = this.proxyUrl || odooEndpoint;

        // Ajustamos el body para que sea compatible tanto con el proxy genérico
        // como con el formato que algunos usuarios usan (url/db/user/pass directos)
        const requestBody = this.proxyUrl ? {
            odooUrl: odooEndpoint,
            rpcData: rpcBody,
            // Soporte para proxies que esperan campos planos:
            url: this.url,
            db: this.db,
            username: this.username,
            password: this.apiKey, // Usamos la API Key como password
            apiKey: this.apiKey
        } : rpcBody;

        console.log(`[Odoo Connector] Llamando a ${service}/${method}`, {
            endpoint,
            rpcParams: rpcBody.params,
            usingProxy: !!this.proxyUrl
        });

        let response;
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } catch (err) {
            console.error(`[Odoo Connector] Error de red:`, err);
            throw new Error(`Error de red al conectar con el proxy: ${err.message}`);
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
            console.log(`[Odoo Connector] Respuesta recibida:`, data);
        } else {
            // Si no es JSON, capturamos el texto para debug
            const text = await response.text();
            console.warn(`[Odoo Connector] Respuesta no es JSON:`, text.substring(0, 500));
            throw new Error(`Respuesta no válida del servidor (no es JSON): ${text.substring(0, 100)}`);
        }

        // Manejo de errores estilo JSON-RPC o del Proxy
        if (data.error) {
            const errorMsg = (typeof data.error === 'object')
                ? (data.error.data?.message || data.error.message || JSON.stringify(data.error))
                : data.error;

            // Caso especial Odoo 18: acciones que devuelven None (void) fallan al serializarse en el servidor
            if (errorMsg && errorMsg.includes('cannot marshal None')) {
                console.warn("[Odoo Connector] Detectado error 'cannot marshal None'. Esto suele significar que Odoo 18 ejecutó la acción correctamente pero falló al devolver un resultado vacío (None). Tratándolo como éxito.");
                return null;
            }

            throw new Error(errorMsg);
        }

        // Manejo de errores estilo JSON-RPC o del Proxy
        let result = data.result;

        // Manejo de formato de proxy personalizado { success, uid, data, mensaje }
        if (data.success !== undefined) {
            if (!data.success) {
                const errorMsg = (typeof data.error === 'object')
                    ? (data.error?.data?.message || data.error?.message || JSON.stringify(data.error))
                    : (data.error || data.mensaje || 'Error desconocido en el proxy');
                throw new Error(errorMsg);
            }

            // Priorizamos data.data si existe (formato común en proxies)
            result = data.data !== undefined ? data.data : data.result;

            // Caso especial para autenticación: devolvemos el objeto completo para capturar el UID
            if (method === 'login' || method === 'authenticate') return data;
        }

        // --- DESENVOLVER RESULTADO ---
        // Algunos proxies envuelven el resultado de Odoo en otro objeto { result: ... }
        if (result && typeof result === 'object' && result.result !== undefined && result.jsonrpc === undefined) {
            console.log(`[Odoo Connector] Desenvolviendo resultado envuelto en .result:`, result.result);
            result = result.result;
        }

        // Identificamos el método real de Odoo si es un execute_kw
        let odooMethod = method;
        if (method === 'execute_kw' && args && args.length >= 5) {
            odooMethod = args[4];
        }

        // Si el resultado es un array de un solo elemento y el método es create o write,
        // Odoo (o el proxy) a veces lo devuelve envuelto en un array.
        if (Array.isArray(result) && result.length === 1 && (odooMethod === 'create' || odooMethod === 'write')) {
            console.log(`[Odoo Connector] Desenvolviendo resultado array para ${odooMethod}:`, result);
            result = result[0];
        }

        // Si el resultado sigue siendo un objeto y tiene un campo 'id', y esperábamos un ID (create)
        if (result && typeof result === 'object' && result.id !== undefined && odooMethod === 'create') {
            console.log(`[Odoo Connector] Extrayendo ID de objeto resultado para create:`, result.id);
            result = result.id;
        }

        console.log(`[Odoo Connector] Resultado final para ${service}/${method}:`, result);
        return result;
    }
}
