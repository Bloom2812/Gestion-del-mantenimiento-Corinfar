from playwright.sync_api import sync_playwright
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto("http://localhost:3000")
        time.sleep(5)

        # Check window properties again
        res = page.evaluate("""() => {
            return {
                notify: typeof window.notifyAdminsAndPlanners,
                exp: typeof window.checkMaintenanceExpirations,
                upd: typeof window.updatePlanNotifications
            }
        }""")
        print(res)

        browser.close()

if __name__ == "__main__":
    run_verification()
