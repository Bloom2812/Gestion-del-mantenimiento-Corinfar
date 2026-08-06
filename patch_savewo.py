import re

with open('script.js', 'r') as f:
    content = f.read()

# We need to insert the pre-check before updateStockForOrder in saveWorkOrder
search_str = """        // Stock validation only happens when trying to complete the order.
        if (orderData.status === 'Pendiente de Evaluación' || orderData.status === 'Completado' || orderData.status === 'Pendiente de Aprobación') {"""

replace_str = """        // Stock validation only happens when trying to complete the order.
        if (orderData.status === 'Pendiente de Evaluación' || orderData.status === 'Completado' || orderData.status === 'Pendiente de Aprobación') {
            // PRE-CHECK: Validar stock y pedir justificación obligatoria si falta
            const oldPartsMap = new Map((existingOrder.partsUsed || []).map(p => [p.partId, p]));
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
                const obsTextarea = document.getElementById('wo-observaciones');
                if (obsTextarea) obsTextarea.value = orderData.observaciones;
                updates.observaciones = orderData.observaciones;
            }
"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    with open('script.js', 'w') as f:
        f.write(content)
    print("Patched saveWorkOrder successfully.")
else:
    print("Could not find target string in saveWorkOrder.")
