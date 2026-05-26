import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

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

            window.state = {
                parts: [
                    { id: 'PART-001', description: 'Rodamiento 6204', classification: 'repuesto', stockActual: 10 },
                    { id: 'PART-002', name: 'Grasa Litio', classification: 'insumo', currentStock: 5 },
                    { classification: 'repuesto', stockActual: 100 } // Edge case: missing ID and description
                ],
                currentRole: 'Técnico',
                tempSolicitudItems: [],
                machines: []
            };

            window.showSolicitudModal();

            const typeSelect = document.getElementById('solicitud-type');
            typeSelect.value = 'insumos';
            typeSelect.dispatchEvent(new Event('change'));
        }''')

        await asyncio.sleep(2)

        modal = await page.query_selector('#solicitud-modal .modal-content')
        if modal:
            await modal.screenshot(path='final_verification_modal.png')

            # Check options
            options = await page.inner_html('#solicitud-item-part-select')
            print("Options in selector:")
            print(options)

            # Test search with name
            await page.fill('#solicitud-item-search', 'Grasa')
            await asyncio.sleep(1)
            await modal.screenshot(path='final_verification_search_name.png')

            # Test search with ID
            await page.fill('#solicitud-item-search', 'PART-001')
            await asyncio.sleep(1)
            await modal.screenshot(path='final_verification_search_id.png')
        else:
            print("Modal not found")

        await browser.close()

asyncio.run(run())
