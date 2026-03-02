from playwright.sync_api import sync_playwright, expect
import time
import os

def run_verification():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Navigate to the app (using local file)
        abs_path = os.path.abspath("index.html")
        page.goto(f"file://{abs_path}")

        # Inject mock state by mutating the existing object
        page.evaluate("""
            if (window.state) {
                window.state.currentUser = { username: 'admin', role: 'Admin', permissions: ['all'] };
                window.state.machines = [
                    { id: 'MAC-001', name: 'Máquina de Prueba 1', location: 'Planta A', centroCosto: 'CC-01' },
                    { id: 'MAC-002', name: 'Máquina de Prueba 2', location: 'Planta B', centroCosto: 'CC-02' }
                ];
                window.state.technicians = [
                    { username: 'tech1', role: 'Técnico' },
                    { username: 'tech2', role: 'Técnico' }
                ];
                window.state.workOrders = [
                    { id: 'OT-001', fb_id: 'fb1', machineId: 'MAC-001', type: 'Correctivo', status: 'Completado', date: '2025-01-01', description: 'Falla mecánica' },
                    { id: 'OT-002', fb_id: 'fb2', machineId: 'MAC-001', type: 'Preventivo', status: 'Pendiente', date: '2025-02-01', description: 'Mantenimiento' }
                ];

                // Mock charts and modals to prevent errors
                window.state.charts = {
                   maintenance: { data: { datasets: [{data: [0,0]}] }, update: () => {} },
                   failureType: { data: { datasets: [{data: [0,0,0,0]}] }, update: () => {} },
                   taskStatus: { data: { datasets: [{data: [0,0,0,0,0,0]}] }, update: () => {} },
                   machineCriticidad: { data: { datasets: [{data: [0,0,0]}] }, update: () => {} },
                   correctiveTrends: { data: { datasets: [{},{}] }, update: () => {} }
                };
                window.state.modals = {
                    machineHistory: { show: () => {
                        document.getElementById('machine-history-modal').classList.add('show');
                        document.getElementById('machine-history-modal').style.display = 'block';
                    }, hide: () => {
                        document.getElementById('machine-history-modal').classList.remove('show');
                        document.getElementById('machine-history-modal').style.display = 'none';
                    } }
                };

                // Re-initialize UI
                if (typeof applyUserPermissions === 'function') applyUserPermissions();
                if (typeof populateDynamicSelectors === 'function') populateDynamicSelectors();
                if (typeof populateDateSelectors === 'function') populateDateSelectors();

                // Show the app and hide login
                document.getElementById('login-overlay').classList.add('d-none');
                document.getElementById('app-wrapper').classList.remove('d-none');

                // Switch to dashboard
                if (typeof switchTab === 'function') switchTab('dashboard');
            }
        """)

        # Wait for elements
        page.wait_for_selector("#kpi-machine-select")

        # Check if MAC-001 is present
        options = page.evaluate("Array.from(document.getElementById('kpi-machine-select').options).map(o => o.value)")
        print(f"Options found: {options}")

        if "MAC-001" in options:
            page.select_option("#kpi-machine-select", value="MAC-001")
            page.evaluate("document.getElementById('kpi-machine-select').dispatchEvent(new Event('change'))")
            page.wait_for_selector("#kpi-view-history-btn:not(.d-none)")
            print("History button is visible after selecting machine.")
        else:
            print("MAC-001 NOT FOUND in selector.")

        # Take screenshots
        page.screenshot(path="verification/dashboard_verified.png")

        # Switch to reports and check
        page.evaluate("switchTab('reportes')")
        page.wait_for_selector("#report-machine-select")
        report_options = page.evaluate("document.getElementById('report-machine-select').options.length")
        print(f"Report machine options: {report_options}")
        page.screenshot(path="verification/reports_verified.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
