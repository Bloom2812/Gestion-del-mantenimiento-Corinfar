from playwright.sync_api import Page, expect, sync_playwright
import time
import os

def test_changes(page: Page):
    # Try to load the page from the local server
    page.goto("http://localhost:3000", timeout=15000)

    # Wait for initial DOM
    time.sleep(3)

    # Inject script to bypass login and show everything
    page.evaluate("""
        // Force immediate initialization if possible
        if (typeof state !== 'undefined') {
            state.currentUser = { username: 'admin', role: 'Admin' };
            state.machines = [
                { id: 'MAQ-001', name: 'Bomba de Agua', location: 'Planta 1', status: 'OPERATIVO' },
                { id: 'MAQ-002', name: 'Compresor Aire', location: 'Planta 2', status: 'OPERATIVO' },
                { id: 'CAL-001', name: 'Balanza de Precisión', location: 'Laboratorio', status: 'OPERATIVO' }
            ];
            state.modals = state.modals || {};
            if (document.getElementById('solicitud-modal')) {
                state.modals.solicitud = new bootstrap.Modal(document.getElementById('solicitud-modal'));
            }
        }

        // Remove all overlays
        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.style.display = 'none';
        const loadingOverlay = document.getElementById('global-loading');
        if (loadingOverlay) loadingOverlay.style.setProperty('display', 'none', 'important');

        const appWrapper = document.getElementById('app-wrapper');
        if (appWrapper) {
            appWrapper.classList.remove('d-none');
            appWrapper.style.display = 'block';
        }

        // Initialize selectors
        if (typeof populateDynamicSelectors === 'function') {
            populateDynamicSelectors();
        }
    """)

    time.sleep(2)

    # --- VERIFICATION 1: SOLICITUDES AND CALIBRATION ---
    print("Verifying Solicitud Modal...")
    # Call window.showSolicitudModal
    page.evaluate("if(window.showSolicitudModal) window.showSolicitudModal();")
    time.sleep(1)

    # Check if Calibracion exists in select
    cal_option = page.locator("#solicitud-type option[value='calibracion']")
    if cal_option.count() > 0:
        print("Calibración option found.")
    else:
        print("Calibración option NOT found.")
        # Try to find it again after a small wait
        time.sleep(2)
        if cal_option.count() > 0:
             print("Calibración option found after wait.")

    # Screenshot of modal
    page.screenshot(path="verification/1_solicitud_modal.png")

    # Check for search input
    search_input = page.locator("#solicitud-machine-search")
    if search_input.count() > 0:
        print("Search input found.")
        page.fill("#solicitud-machine-search", "Balanza")
        time.sleep(1)
        page.screenshot(path="verification/2_solicitud_search_filter.png")
    else:
        print("Search input NOT found.")

    # Close modal
    page.keyboard.press("Escape")
    time.sleep(0.5)

    # --- VERIFICATION 2: DASHBOARD KPIs ---
    print("Verifying Dashboard KPIs...")
    page.evaluate("window.switchTab('dashboard')")
    time.sleep(1)
    page.screenshot(path="verification/3_dashboard_search.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        try:
            test_changes(page)
            print("Verification completed successfully.")
        except Exception as e:
            print(f"Error during verification: {e}")
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()
