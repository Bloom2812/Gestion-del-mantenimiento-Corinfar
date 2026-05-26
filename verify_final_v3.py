import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))

        try:
            await page.goto('http://localhost:3000', timeout=60000)
        except Exception as e:
            print(f"Error loading page: {e}")
            await browser.close()
            return

        # Inject mock state and show modal
        await page.evaluate('''() => {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('app-wrapper').classList.remove('d-none');

            window.state.parts = [
                { id: 'PART-001', description: 'Rodamiento 6204', classification: 'repuesto', stockActual: 10 },
                { id: 'PART-002', name: 'Grasa Litio', classification: 'insumo', currentStock: 5 },
                { classification: 'repuesto', stockActual: 100 }
            ];
            window.state.currentRole = 'Técnico';

            window.showSolicitudModal();

            const typeSelect = document.getElementById('solicitud-type');
            typeSelect.value = 'insumos';
            typeSelect.dispatchEvent(new Event('change'));

            console.log("Manual trigger of populateSolicitudItemSelector");
            window.populateSolicitudItemSelector();
        }''')

        await asyncio.sleep(2)

        modal = await page.query_selector('#solicitud-modal .modal-content')
        if modal:
            await modal.screenshot(path='final_verification_modal_v3.png')
            options = await page.inner_html('#solicitud-item-part-select')
            print("Options in selector:")
            print(options)

        await browser.close()

asyncio.run(run())
