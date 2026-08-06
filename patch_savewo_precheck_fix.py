import re

with open('script.js', 'r') as f:
    content = f.read()

search_str = """            // PRE-CHECK: Validar stock y pedir justificación obligatoria si falta
            const oldPartsMap = new Map((existingOrder.partsUsed || []).map(p => [p.partId, p]));"""

replace_str = """            const wasAlreadyProcessedPre = ['Pendiente de Evaluación', 'Completado', 'Pendiente de Aprobación'].includes(oldStatus);
            const preCheckOldOrder = wasAlreadyProcessedPre ? existingOrder : { partsUsed: [] };

            // PRE-CHECK: Validar stock y pedir justificación obligatoria si falta
            const oldPartsMap = new Map((preCheckOldOrder.partsUsed || []).map(p => [p.partId, p]));"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    with open('script.js', 'w') as f:
        f.write(content)
    print("Patched saveWorkOrder pre-check logic successfully.")
else:
    print("Could not find target string for pre-check in saveWorkOrder.")
