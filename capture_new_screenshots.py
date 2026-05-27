import asyncio
from playwright.async_api import async_playwright
import os

async def capture_new_screenshots():
    if not os.path.exists('manual_images'):
        os.makedirs('manual_images')

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        await page.goto(f'file://{os.getcwd()}/index.html')
        await asyncio.sleep(2)

        # 1. Olvido Contraseña Modal
        await page.evaluate("""
            document.getElementById('global-loading').style.display = 'none';
            const forgotLink = document.getElementById('forgot-password-link');
            if (forgotLink) forgotLink.click();
        """)
        await asyncio.sleep(0.5)
        # Ensure modal is fully visible and center it for a good shot
        await page.screenshot(path='manual_images/olvido_contrasena_modal.png')

        # Close modal
        await page.evaluate("""
            const modalEl = document.getElementById('forgot-password-modal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        """)
        await asyncio.sleep(0.5)

        # 2. Sidebar Solicitudes highlighting
        await page.evaluate("""
            document.getElementById('login-overlay').classList.add('d-none');
            document.getElementById('app-wrapper').classList.remove('d-none');

            // Force Sidebar to be visible if it was hidden by some logic
            document.querySelector('.sidebar').style.display = 'block';

            const solicitudesTab = document.querySelector('[data-tab="solicitudes"]');
            if (solicitudesTab) {
                solicitudesTab.style.border = '3px solid #ffcc00';
                solicitudesTab.style.backgroundColor = 'rgba(255, 204, 0, 0.2)';
            }
        """)
        # We only need the sidebar area for this one, but a full page is fine too.
        # Maybe crop to sidebar?
        sidebar = await page.query_selector('.sidebar')
        if sidebar:
            await sidebar.screenshot(path='manual_images/sidebar_solicitudes.png')
        else:
            await page.screenshot(path='manual_images/sidebar_solicitudes.png')

        # 3. Nueva Solicitud Llena
        await page.evaluate("""
            // Reset state or set mock state
            window.state = {
                user: { role: 'Operario', username: 'operario01' },
                machines: [
                    {id: 'MAQ-001', name: 'Bomba de Agua - Principal', location: 'Planta de Producción', criticidad: 'Alta', status: 'ACTIVO', fb_id: '123'}
                ],
                parts: [],
                solicitudes: []
            };

            if (window.switchTab) switchTab('solicitudes');

            // Show modal
            const solModalEl = document.getElementById('solicitud-modal');
            const solModal = new bootstrap.Modal(solModalEl);
            solModal.show();
        """)
        await asyncio.sleep(0.5)

        await page.evaluate("""
            // Fill form
            const typeSelect = document.getElementById('solicitud-type');
            typeSelect.value = 'mantenimiento';

            const machineSelect = document.getElementById('solicitud-machine');
            machineSelect.innerHTML = '<option value="123" selected>MAQ-001 - Bomba de Agua - Principal | Planta de Producción</option>';

            const descArea = document.getElementById('solicitud-description');
            descArea.value = 'La bomba presenta un ruido inusual y una pequeña fuga en el sello mecánico. Se requiere revisión técnica urgente para evitar parada de línea.';
        """)

        # Take screenshot of the modal
        modal_content = await page.query_selector('#solicitud-modal .modal-content')
        if modal_content:
            await modal_content.screenshot(path='manual_images/nueva_solicitud_llena.png')
        else:
            await page.screenshot(path='manual_images/nueva_solicitud_llena.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(capture_new_screenshots())
