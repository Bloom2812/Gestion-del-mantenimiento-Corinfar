# Guía de Integración: CORINFAR CMMS + Odoo Online

Esta guía detalla los pasos necesarios para conectar tu aplicación de mantenimiento con Odoo Online de forma directa (desde el navegador), permitiendo la sincronización bidireccional de Repuestos, Órdenes de Trabajo y Técnicos.

---

## ⚠️ Advertencia de Seguridad y CORS

1.  **Seguridad:** Al realizar una conexión "directa", las credenciales de Odoo (Base de Datos, Usuario, API Key) se exponen en el código fuente del navegador. **Se recomienda encarecidamente usar una Función de Firebase (Cloud Function) como puente.**
2.  **CORS:** Odoo Online generalmente no permite peticiones desde dominios externos (CORS). Esta aplicación incluye una estructura de Firebase Functions para solucionar este problema mediante un Proxy.

---

## 1. Requisitos Previos en Odoo

Antes de empezar, necesitas los siguientes datos de tu instancia de Odoo:

*   **URL de la Base de Datos:** Ejemplo: `https://tu-empresa.odoo.com`
*   **Nombre de la Base de Datos:** Lo encuentras en la pantalla de login o configuración.
*   **Usuario (Email):** El correo con el que accedes.
*   **API Key:** Ve a tu perfil en Odoo -> Pestaña "Seguridad" -> Generar "Nueva API Key". **No uses tu contraseña personal.**

---

## 2. Mapeo de Datos

Para que la sincronización funcione, debemos mapear los campos de Firebase con los modelos de Odoo:

### A. Repuestos e Inventario
*   **Firebase Collection:** `parts`
*   **Odoo Model:** `product.product`
*   **Mapeo sugerido:**
    *   `id` (Firebase) <-> `default_code` (Odoo)
    *   `description` <-> `name`
    *   `stock` <-> `qty_available` (Solo lectura en Odoo, se actualiza vía `stock.quant`)
    *   `cost` <-> `standard_price`

### B. Órdenes de Trabajo (OT)
*   **Firebase Collection:** `workOrders`
*   **Odoo Model:** `maintenance.request` (Requiere módulo de Mantenimiento instalado)
*   **Mapeo sugerido:**
    *   `id` (Firebase) <-> `name`
    *   `description` <-> `description`
    *   `status` <-> `stage_id` (Requiere mapear IDs de etapas)
    *   `type` <-> `maintenance_type` ('preventive' o 'corrective')

### C. Técnicos
*   **Firebase Collection:** `technicians`
*   **Odoo Model:** `res.users` o `hr.employee`
*   **Mapeo sugerido:**
    *   `username` <-> `name`
    *   `role` <-> (Mapeo a grupos de seguridad en Odoo)

---

## 3. Guía Paso a Paso para la Implementación

### Paso 1: Despliegue del Proxy (Recomendado para CORS)
Si experimentas errores de CORS, debes desplegar la Cloud Function incluida en la carpeta `functions/`:

1.  Asegúrate de tener `firebase-tools` instalado: `npm install -g firebase-tools`.
2.  Inicia sesión: `firebase login`.
3.  Inicializa las funciones (si no lo has hecho): `firebase init functions` (selecciona "Use an existing project").
4.  Copia los archivos `functions/index.js` y `functions/package.json` si el comando anterior los sobrescribió.
5.  Despliega: `firebase deploy --only functions`.
6.  Copia la **Function URL** que te devuelve Firebase (ej: `https://us-central1-tu-proyecto.cloudfunctions.net/odooProxy`).

### Paso 2: Configuración en la App
1.  Entra en la pestaña **Configuración** de la aplicación CORINFAR CMMS.
2.  Rellena los datos de Odoo (URL, DB, Usuario, API Key).
3.  En el campo **URL del Proxy**, pega la URL que obtuviste en el paso anterior.
4.  Haz clic en **Probar Conexión** y luego en **Guardar Configuración**.

### Paso 3: Autenticación
La API de Odoo requiere primero obtener un `uid` (User ID). Este proceso se hace llamando al servicio `common`. Una vez obtenido, se usa para todas las operaciones en el servicio `object`.

### Paso 4: Sincronización App -> Odoo (Salida)
En `script.js`, cada vez que se guarda una OT o se actualiza un repuesto:
1.  Llamar a la función de guardado en Firebase.
2.  Si tiene éxito, llamar al conector de Odoo para crear o actualizar el registro equivalente.

### Paso 5: Sincronización Odoo -> App (Entrada)
Como la conexión es directa, la forma más sencilla de obtener cambios desde Odoo es mediante **Polling**:
1.  Al cargar la aplicación, consultar a Odoo por registros modificados después de la última fecha de sincronización.
2.  Actualizar Firestore con los nuevos datos recibidos.

---

## 4. Ejemplo de Flujo de Sincronización (Lógica)

```javascript
// Ejemplo de cómo se vería la integración en el guardado de una OT
async function saveWorkOrder(extraData = {}) {
    // ... lógica existente de recolección de datos ...

    try {
        // 1. Guardar en Firebase
        const docRef = await addDoc(state.collections.workOrders, woData);

        // 2. Sincronizar con Odoo
        if (state.odooConnected) {
            await odoo.create('maintenance.request', {
                name: woData.id,
                description: woData.description,
                maintenance_type: woData.type.toLowerCase() === 'preventivo' ? 'preventive' : 'corrective',
                // ... otros campos
            });
        }

        showToast('Guardado en Firebase y Odoo', 'success');
    } catch (e) {
        console.error("Error en sincronización:", e);
    }
}
```

---

## 5. Instrucciones para Finalizar la Integración (Merge y Deploy)

Como ya hemos preparado todo el código en una rama separada, sigue estos pasos para activarlo en tu sitio:

### Paso A: Fusionar los cambios en GitHub (Merge)
1. Entra en tu repositorio de GitHub.
2. Verás un aviso que dice algo como: **"jules-... has recent pushes. Compare & pull request"**. Haz clic en el botón verde.
3. Si no lo ves, ve a la pestaña **"Pull Requests"** y busca la que dice **"Integración Odoo V2.0"**.
4. Haz clic en **"Merge pull request"** y luego en **"Confirm merge"**. Esto unirá el código nuevo con tu rama principal (`main`).

### Paso B: Actualizar tu código local
En tu terminal (donde sueles escribir los comandos), asegúrate de estar en la rama principal y descargar los cambios:
```bash
git checkout main
git pull origin main
```

### Paso C: Desplegar a Firebase
Ahora envía el código a internet para que tu app se actualice:
1. **Funciones (el puente):** Entra en la carpeta `functions` y despliega:
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```
2. **Aplicación (el frontal):** Vuelve a la carpeta raíz y despliega el sitio web:
   ```bash
   cd ..
   firebase deploy --only hosting
   ```

---

## 6. Cómo Probar la Integración

Para verificar que la sincronización con Odoo está funcionando correctamente, sigue estos pasos:

1.  **Configuración Inicial:**
    *   Ve a la pestaña **Configuración** en la aplicación.
    *   Ingresa los datos de tu instancia de Odoo (URL, Base de Datos, Usuario/Email y API Key).
    *   Si usas el proxy de Firebase (recomendado), asegúrate de haberlo desplegado y pega su URL en el campo correspondiente.
    *   Haz clic en **Probar Conexión**. Deberías ver un mensaje de éxito.
    *   **Importante:** Haz clic en **Guardar Configuración** para aplicar los cambios.

2.  **Sincronización de Maquinaria:**
    *   Ve a la pestaña **Maquinaria**.
    *   Crea una nueva máquina o edita una existente.
    *   Al guardar, la aplicación buscará (o creará) este equipo en el módulo de Mantenimiento de Odoo.
    *   Verifica en Odoo (**Mantenimiento -> Equipamiento**) que la máquina aparezca con el nombre correcto.

3.  **Creación de Solicitudes:**
    *   Ve a la pestaña **Solicitudes**.
    *   Haz clic en **+ Nueva Solicitud**.
    *   Selecciona la máquina que verificaste en el paso anterior y escribe una descripción.
    *   Haz clic en **Enviar Solicitud**.

4.  **Verificación Final en Odoo:**
    *   Entra en tu instancia de Odoo.
    *   Ve al módulo de **Mantenimiento -> Solicitudes de mantenimiento**.
    *   Deberías ver una nueva solicitud con el ID de tu app (ej: `SOL-0001`) y la descripción que ingresaste.
    *   La solicitud estará vinculada automáticamente al equipo correspondiente.
