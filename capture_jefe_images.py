import asyncio
from playwright.async_api import async_playwright
import os

async def capture_screenshots():
    if not os.path.exists('manual_images'):
        os.makedirs('manual_images')

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 900})
        page = await context.new_page()

        await page.goto(f'file://{os.getcwd()}/index.html')
        await asyncio.sleep(2)

        # UI State Setup
        await page.evaluate("""
            document.getElementById('global-loading').style.display = 'none';
            document.getElementById('login-overlay').classList.add('d-none');
            document.getElementById('app-wrapper').classList.remove('d-none');

            window.state = {
                user: { role: 'Jefe de Area', username: 'jefe.area', managedMachineIds: ['MAQ-001'] },
                currentUser: { role: 'Jefe de Area', username: 'jefe.area', managedMachineIds: ['MAQ-001'] },
                technicians: [{username: 'jefe.area', role: 'Jefe de Area'}],
                machines: [{id: 'MAQ-001', name: 'Bomba de Agua', location: 'Planta 1', criticidad: 'Alta', status: 'ACTIVO'}],
                parts: [{id: 'PART-001', description: 'Filtro de Aire', stockActual: 10, stockMin: 5}],
                workOrders: [{id: 'OT-001', machineId: 'MAQ-001', description: 'Mantenimiento Preventivo', status: 'En Ejecución', type: 'Preventivo'}],
                solicitudes: [{id: 'SOL-0001', machineId: 'MAQ-001', description: 'Falla detectada', status: 'Pendiente', date: new Date().toISOString()}],
                partRequests: [
                    {
                        id: 'REQ-001',
                        machineId: 'MAQ-001',
                        requester: 'operario.planta',
                        status: 'PENDIENTE_APROBACION',
                        timestamp: Date.now(),
                        items: [{partId: 'PART-001', quantity: 2, description: 'Filtro de Aire'}]
                    }
                ],
                evaluationCriteria: [
                    { id: 'c1', text: 'Limpieza del área', role: 'Jefe de Area' },
                    { id: 'c2', text: 'Equipo operativo', role: 'Jefe de Area' }
                ],
                liveWorkOrders: {},
                workPlans: [{
                    id: 'PLAN-001',
                    machineId: 'MAQ-001',
                    name: 'Preventivo Mensual',
                    frequency: 30,
                    status: 'ACTIVO',
                    lastDate: Date.now() - 86400000 * 15,
                    nextDate: Date.now() + 86400000 * 15
                }],
                workPlanExecutions: []
            };
        """)

        # 4. Jefe de Area - Solicitudes de Repuestos (Aprobación)
        await page.evaluate("""
            const container = document.getElementById('part-request-list');
            if (container) {
                container.innerHTML = `
                    <tr>
                        <td>REQ-001</td>
                        <td>15/02/2026</td>
                        <td>-</td>
                        <td>Filtro de Aire (x2)</td>
                        <td>2</td>
                        <td><span class="badge bg-warning">Alta</span></td>
                        <td>Operario Planta</td>
                        <td><span class="badge bg-info">Pendiente Aprobación</span></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-success me-1"><i class="fas fa-check"></i></button>
                            <button class="btn btn-sm btn-danger"><i class="fas fa-times"></i></button>
                        </td>
                    </tr>
                `;
            }
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('d-none'));
            document.getElementById('solicitudes-repuestos').classList.remove('d-none');
        """)
        await asyncio.sleep(0.5)
        await page.screenshot(path='manual_images/jefe_aprobacion_insumos.png')

        # 5. Jefe de Area - Evaluacion OT
        await page.evaluate("""
            const container = document.getElementById('evaluation-criteria-container');
            if (container) {
                container.innerHTML = `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="crit-c1">
                        <label class="form-check-label" for="crit-c1">Limpieza del área</label>
                    </div>
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" id="crit-c2">
                        <label class="form-check-label" for="crit-c2">Equipo operativo</label>
                    </div>
                `;
            }
            const modal = document.getElementById('evaluation-modal');
            if (modal) {
                modal.classList.add('show');
                modal.style.display = 'block';
                modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
            }
        """)
        await asyncio.sleep(0.5)
        await page.screenshot(path='manual_images/jefe_evaluacion_modal.png')
        await page.evaluate("""
            const modal = document.getElementById('evaluation-modal');
            if (modal) {
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        """)

        # 6. Planificador (Vista Jefe)
        await page.evaluate("""
            const container = document.getElementById('work-plans-container');
            if (container) {
                container.innerHTML = `
                    <div class="col-md-4">
                        <div class="card wp-machine-card shadow-sm h-100">
                            <div class="card-body">
                                <h5 class="card-title fw-bold small">MAQ-001 - Bomba de Agua</h5>
                                <p class="text-muted small mb-2" style="font-size:0.7rem;"><i class="fas fa-map-marker-alt me-1"></i> Planta 1</p>
                                <div class="d-flex align-items-center mb-3">
                                    <span class="badge bg-success me-2" style="font-size:0.6rem;">Activo</span>
                                    <span class="badge bg-primary" style="font-size:0.6rem;">1 Plan</span>
                                </div>
                                <div class="wp-plan-item p-2 border rounded bg-light mb-2">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="fw-bold" style="font-size:0.75rem;">Preventivo Mensual</span>
                                        <span class="badge bg-success" style="font-size:0.6rem;">En fecha</span>
                                    </div>
                                    <div class="progress mt-2" style="height: 6px;">
                                        <div class="progress-bar bg-success" style="width: 50%;"></div>
                                    </div>
                                    <div class="d-flex justify-content-between mt-1" style="font-size: 0.65rem;">
                                        <span>Último: 15/01/26</span>
                                        <span>Próximo: 15/02/26</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('d-none'));
            document.getElementById('planificador').classList.remove('d-none');
        """)
        await asyncio.sleep(0.5)
        await page.screenshot(path='manual_images/jefe_planificador.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(capture_screenshots())
