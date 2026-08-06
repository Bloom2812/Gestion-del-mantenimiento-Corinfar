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

        # 1. Capture Login (Force visible)
        await page.evaluate("""
            document.getElementById('global-loading').style.display = 'none';
            document.getElementById('login-overlay').classList.remove('d-none');
            document.getElementById('username').disabled = false;
        """)
        await page.screenshot(path='manual_images/acceso_sistema.png')

        # 2. UI State Setup
        await page.evaluate("""
            // Hide Login
            document.getElementById('login-overlay').classList.add('d-none');
            // Show App
            document.getElementById('app-wrapper').classList.remove('d-none');

            // Mock state
            window.state = {
                user: { role: 'Admin', username: 'admin' },
                technicians: [{username: 'admin', role: 'Admin'}],
                machines: [{id: 'MAQ-001', name: 'Bomba de Agua', location: 'Planta 1', criticidad: 'Alta', status: 'ACTIVO'}],
                parts: [{id: 'PART-001', description: 'Filtro de Aire', stockActual: 10, stockMin: 5}],
                workOrders: [{id: 'OT-001', machineId: 'MAQ-001', description: 'Mantenimiento Preventivo', status: 'En Ejecución', type: 'Preventivo'}],
                solicitudes: [{id: 'SOL-0001', machineId: 'MAQ-001', description: 'Falla detectada', status: 'Pendiente', date: new Date().toISOString()}]
            };

            // Define helpers if they were not loaded (they should be, but let's be safe)
            window.forceShowModal = (id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.add('show');
                el.style.display = 'block';
                el.style.backgroundColor = 'rgba(0,0,0,0.5)';
                document.body.classList.add('modal-open');
            };
            window.forceHideModal = (id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.remove('show');
                el.style.display = 'none';
                document.body.classList.remove('modal-open');
            };
        """)

        # 3. Dashboard
        await page.evaluate("if (window.switchTab) switchTab('dashboard');")
        await asyncio.sleep(0.5)
        await page.screenshot(path='manual_images/dashboard_light.png')
        await page.click('#theme-toggle-btn')
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/dashboard_dark.png')
        await page.click('#theme-toggle-btn')

        # 4. Solicitudes
        await page.evaluate("if (window.switchTab) switchTab('solicitudes');")
        await asyncio.sleep(0.5)
        await page.screenshot(path='manual_images/solicitudes_operario.png')

        # 5. Nueva Solicitud Modal
        await page.evaluate("forceShowModal('solicitud-modal')")
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/nueva_solicitud_inventario.png')

        # 6. Busqueda Repuestos
        await page.select_option('#solicitud-type', 'insumos')
        await page.evaluate("""
            const sel = document.getElementById('solicitud-item-part-select');
            if (sel) sel.innerHTML = '<option value="PART-001">Filtro de Aire [PART-001] (Stock: 10)</option>';
        """)
        await page.fill('#solicitud-item-search', 'Filtro')
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/busqueda_repuestos.png')

        # 7. Solicitud Detalle
        await page.evaluate("""
            const tbody = document.getElementById('solicitud-items-table-body');
            if (tbody) tbody.innerHTML = '<tr><td>Filtro de Aire</td><td class="text-center">2</td><td><button class="btn btn-sm btn-link text-danger"><i class="fas fa-trash"></i></button></td></tr>';
            const multi = document.getElementById('solicitud-multi-items-section');
            if (multi) multi.classList.remove('d-none');
        """)
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/solicitud_detalle.png')
        await page.evaluate("forceHideModal('solicitud-modal')")

        # 8. Modal OT
        await page.evaluate("forceShowModal('work-order-modal')")
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/modal_ot.png')
        await page.evaluate("forceHideModal('work-order-modal')")

        # 9. Firma
        await page.evaluate("forceShowModal('passwordConfirmModal')")
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/firma_seguridad.png')
        await page.evaluate("forceHideModal('passwordConfirmModal')")

        # 10. Odoo
        await page.evaluate("if (window.switchTab) switchTab('configuracion');")
        await asyncio.sleep(0.3)
        await page.screenshot(path='manual_images/odoo_config.png')

        # 11. Mobile
        await browser.close()
        browser = await p.chromium.launch()
        mobile_context = await browser.new_context(viewport={'width': 375, 'height': 667}, is_mobile=True)
        mobile_page = await mobile_context.new_page()
        await mobile_page.goto(f'file://{os.getcwd()}/index.html')
        await mobile_page.evaluate("""
            if (document.getElementById('global-loading')) document.getElementById('global-loading').style.display = 'none';
            if (document.getElementById('login-overlay')) document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('app-wrapper').classList.remove('d-none');
        """)
        await asyncio.sleep(1)
        await mobile_page.screenshot(path='manual_images/dashboard_mobile.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(capture_screenshots())
