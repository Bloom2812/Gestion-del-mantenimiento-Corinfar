import re

with open('script.js', 'r') as f:
    content = f.read()

# We need to insert the pre-check before updateStockForOrder in handleKanbanWorkOrderAction
search_str = """        if (finalStatus === 'Pendiente de Evaluación' || finalStatus === 'Completado' || finalStatus === 'Pendiente de Aprobación') {
            const wasAlreadyProcessed = ['Pendiente de Evaluación', 'Completado', 'Pendiente de Aprobación'].includes(oldStatus);
            // Si ya estaba en un estado que descuenta stockActual, pasamos el objeto original para calcular el delta (que será 0 si no cambiaron repuestos)
            // Si no, pasamos un objeto vacío para que descuente todo por primera vez
            await updateStockForOrder(wasAlreadyProcessed ? orderData : { partsUsed: [] }, orderData);
        }"""

replace_str = """        if (finalStatus === 'Pendiente de Evaluación' || finalStatus === 'Completado' || finalStatus === 'Pendiente de Aprobación') {
            const wasAlreadyProcessed = ['Pendiente de Evaluación', 'Completado', 'Pendiente de Aprobación'].includes(oldStatus);
            const oldOrderForStockCheck = wasAlreadyProcessed ? orderData : { partsUsed: [] };

            // PRE-CHECK: Validar stock y pedir justificación obligatoria si falta
            const oldPartsMap = new Map((oldOrderForStockCheck.partsUsed || []).map(p => [p.partId, p]));
            let needsJustification = false;
            let missingPartsNames = [];

            for (const item of (orderData.partsUsed || [])) {
                const oldEntry = oldPartsMap.get(item.partId);
                const oldQtyDelivered = (oldEntry && oldEntry.delivered !== false) ? oldEntry.quantity : 0;
                let delta = item.quantity - oldQtyDelivered;

                if (delta > 0) {
                    const part = state.parts.find(p => p.id === item.partId);
                    const currentStock = part ? (part.stockActual || 0) : 0;
                    if (currentStock - delta < 0) {
                        needsJustification = true;
                        missingPartsNames.push(part ? part.description : item.partId);
                    }
                }
            }

            if (needsJustification) {
                const reason = prompt(`No hay stock suficiente para: ${missingPartsNames.join(', ')}. Por favor escriba aquí la justificación para finalizar el trabajo sin estos insumos:`);
                if (!reason || reason.trim() === '') {
                    showToast('Debe ingresar una justificación obligatoria por falta de stock para finalizar la orden.', 'error');
                    showLoading(false);
                    return;
                }
                const note = `\\n\\n[Justificación por falta de stock al finalizar]: ${reason} (Firmado por ${state.currentUser.username})`;
                orderData.observaciones = (orderData.observaciones || "") + note;
                updates.observaciones = orderData.observaciones;
            }

            // Si ya estaba en un estado que descuenta stockActual, pasamos el objeto original para calcular el delta (que será 0 si no cambiaron repuestos)
            // Si no, pasamos un objeto vacío para que descuente todo por primera vez
            await updateStockForOrder(oldOrderForStockCheck, orderData);
        }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    with open('script.js', 'w') as f:
        f.write(content)
    print("Patched handleKanbanWorkOrderAction successfully.")
else:
    print("Could not find target string in handleKanbanWorkOrderAction.")
