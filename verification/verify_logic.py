from playwright.sync_api import sync_playwright
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        abs_path = os.path.abspath("index.html")
        page.goto(f"file://{abs_path}")

        # Test Admin role
        results = page.evaluate("""
            () => {
                window.state.machines = [
                    { id: 'MAC-001', name: 'Machine 1' },
                    { id: 'MAC-002', name: 'Machine 2' }
                ];
                window.state.currentUser = { username: 'admin', role: 'Admin' };

                // Trigger population
                populateDynamicSelectors();

                const dashboardOptions = Array.from(document.getElementById('kpi-machine-select').options).map(o => o.value);
                const reportOptions = Array.from(document.getElementById('report-machine-select').options).map(o => o.value);

                return { dashboardOptions, reportOptions };
            }
        """)
        print(f"Admin Results: {results}")

        # Test Técnico role with assignments
        results_tech = page.evaluate("""
            () => {
                window.state.currentUser = { username: 'tech1', role: 'Técnico', equipoAsignado: ['MAC-001'] };

                // Trigger population
                populateDynamicSelectors();

                const dashboardOptions = Array.from(document.getElementById('kpi-machine-select').options).map(o => o.value);
                const reportOptions = Array.from(document.getElementById('report-machine-select').options).map(o => o.value);

                return { dashboardOptions, reportOptions };
            }
        """)
        print(f"Técnico Results: {results_tech}")

        browser.close()

if __name__ == "__main__":
    run_verification()
