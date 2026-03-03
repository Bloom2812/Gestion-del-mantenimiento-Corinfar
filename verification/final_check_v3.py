from playwright.sync_api import sync_playwright
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        abs_path = os.path.abspath("index.html")
        page.goto(f"file://{abs_path}")

        # Wait for script.js to load and execute
        page.wait_for_timeout(3000)

        is_populate_defined = page.evaluate("typeof window.populateDynamicSelectors === 'function'")
        print(f"window.populateDynamicSelectors defined: {is_populate_defined}")

        is_dashboard_defined = page.evaluate("typeof window.updateDashboardData === 'function'")
        print(f"window.updateDashboardData defined: {is_dashboard_defined}")

        # Check if audit load more exists
        load_more_audit = page.query_selector("#btn-load-more-audit")
        print(f"Audit Load More button exists: {load_more_audit is not None}")

        page.screenshot(path="verification/final_check_v3.png")
        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run_verification()
