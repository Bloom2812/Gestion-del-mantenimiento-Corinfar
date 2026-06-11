import re

with open('script.js', 'r') as f:
    content = f.read()

search_str = """            if (isNew) {
                // For a new order, all parts are new deductions.
                const newOrderForStock = { ...orderData, partsUsed: orderData.partsUsed || [] };
                await updateStockForOrder({ partsUsed: [] }, newOrderForStock);
            } else {
                // For an existing order, calculate the delta of parts used.
                await updateStockForOrder(existingOrder, orderData);
            }"""

replace_str = """            const wasAlreadyProcessed = ['Pendiente de Evaluación', 'Completado', 'Pendiente de Aprobación'].includes(oldStatus);
            const oldOrderForStockCheck = wasAlreadyProcessed ? existingOrder : { partsUsed: [] };

            if (isNew) {
                // For a new order, all parts are new deductions.
                const newOrderForStock = { ...orderData, partsUsed: orderData.partsUsed || [] };
                await updateStockForOrder({ partsUsed: [] }, newOrderForStock);
            } else {
                // For an existing order, calculate the delta of parts used.
                await updateStockForOrder(oldOrderForStockCheck, orderData);
            }"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    with open('script.js', 'w') as f:
        f.write(content)
    print("Patched saveWorkOrder stock logic successfully.")
else:
    print("Could not find target string in saveWorkOrder.")
