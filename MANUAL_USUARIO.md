# Manual de Usuario - CMMS Corinfar

Sistema de Gestión de Mantenimiento Integral diseñado para centralizar operaciones, garantizar trazabilidad y cumplir con normativas de calidad (21 CFR Part 11).

---

## 1. Introducción
La plataforma CMMS de Corinfar permite gestionar el mantenimiento preventivo y correctivo, control de inventarios y KPIs técnicos.

![Dashboard Principal](manual_images/dashboard_light.png)

---

## 2. Acceso al Sistema
Para ingresar al sistema:
1. **Abrir el Navegador:** Ingrese a la dirección web proporcionada.
2. **Identificación:** Escriba su correo electrónico institucional.
3. **Contraseña:** Ingrese su clave personal privada.
4. **Entrar:** Haga clic en "Iniciar Sesión".

---

## 3. Guía para el Operario
Instrucciones detalladas para el personal de planta con poco conocimiento informático.

### 3.1 Cómo realizar una Solicitud de Mantenimiento
Si una máquina falla:
1. Haga clic en el botón **"Nueva Solicitud"**.
2. Seleccione **"Mantenimiento"**.
3. Elija la **Máquina** afectada (ej: Blistera).
4. Escriba qué sucede en la **Descripción**.
5. Seleccione la **Urgencia** y presione **"Guardar"**.

### 3.2 Cómo solicitar un Accesorio o Consumible
1. Haga clic en **"Nueva Solicitud"**.
2. Seleccione **"Insumos y Accesorios"**.
3. Detalle el material, la cantidad y la urgencia.
4. Presione **"Guardar"**.

![Panel de Solicitudes](manual_images/solicitudes_operario.png)

### 3.3 Evaluación del Trabajo
Cuando el técnico termine:
1. Vaya a la pestaña **"Solicitudes"**.
2. Busque las que digan **"Pendiente de Evaluación"**.
3. Presione el botón **"Evaluar"**, califique con estrellas y deje un comentario.

---

## 4. Seguridad (21 CFR Part 11)
El sistema utiliza firmas electrónicas vinculantes para acciones críticas.
- **Doble Verificación:** Requiere firma manuscrita digital y re-entrada de contraseña.
- **Audit Trail:** Cada cambio queda registrado con fecha, hora y usuario.

![Seguridad y Firmas](manual_images/firma_seguridad.png)

---

## 5. Roles y Permisos
- **Admin:** Control total y auditoría.
- **Técnico:** Ejecución de OTs y gestión de repuestos.
- **Operario:** Reporte de fallas y pedidos de insumos.

---

## 6. Órdenes de Trabajo (OT)
- **Correctivas:** Reparaciones inmediatas tras fallas reportadas.
- **Preventivas:** Tareas programadas automáticamente para evitar averías.

![Detalle de OT](manual_images/modal_ot.png)

---

## 7. Dashboard y KPIs
Métricas en tiempo real para la toma de decisiones:
- **MTBF:** Tiempo medio entre fallas.
- **MTTR:** Tiempo medio de reparación.
- **Disponibilidad:** % de operatividad del activo.

![KPIs en Dark Mode](manual_images/dashboard_dark.png)

---

## 8. Integración Odoo
Sincronización bidireccional de:
- **Equipos:** Identificados por número de serie.
- **Repuestos:** Sincronización de stock y costos.
- **Usuarios:** Gestión centralizada de técnicos.

![Configuración Odoo](manual_images/odoo_config.png)

---

## 9. Diseño Responsivo (Móvil)
Optimizado para tablets y smartphones, facilitando el trabajo en planta.

![Vista Móvil](manual_images/dashboard_mobile.png)

---

## 10. Consejos Útiles
- **Sin Miedo:** El sistema es robusto y permite corregir errores antes de guardar.
- **Mensajes de Alerta:** Si algo falla, lea los mensajes en rojo para saber qué corregir.
- **Ayuda Visual:** Use los iconos para guiarse; están pensados para ser intuitivos.
- **Movilidad:** Use su celular para subir fotos directas de las máquinas.
- **Cierre de Sesión:** Siempre salga de su cuenta al terminar por seguridad.

---

## 11. Actualización: Guía Visual Paso a Paso para el Operario
Esta sección ha sido añadida para facilitar el uso del sistema con ejemplos visuales claros.

### Paso 1: Acceso Seguro y Firma
Cada vez que entre o confirme un trabajo, debe ingresar su contraseña.
![Pantalla de Seguridad](manual_images/firma_seguridad.png)

### Paso 2: Revisar sus Solicitudes
En el menú lateral, haga clic en **"Solicitudes"** para ver sus reportes.
![Panel de Solicitudes](manual_images/solicitudes_operario.png)

### Paso 3: Solicitar Repuestos o Insumos
Use el botón **"Nueva Solicitud"** para pedir materiales al almacén.
![Formulario de Solicitud](manual_images/modal_ot.png)

### Paso 4: Evaluación del Trabajo
Al finalizar una reparación, presione el botón **"Evaluar"** en su lista de solicitudes para cerrar el ciclo de mantenimiento.

---
*© 2026 Corinfar CMMS - Documentación Confidencial (Actualizado: Febrero 2026)*
