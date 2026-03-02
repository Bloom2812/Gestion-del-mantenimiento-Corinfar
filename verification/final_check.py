from playwright.sync_api import sync_playwright
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        abs_path = os.path.abspath("index.html")
        page.goto(f"file://{abs_path}")

        # Basic check: is the history button there?
        history_btn = page.query_selector("#kpi-view-history-btn")
        print(f"KPI History button exists: {history_btn is not None}")

        # Check report selectors in HTML
        executive_area = page.query_selector("#report-executive-area")
        print(f"Executive Area selector exists: {executive_area is not None}")

        # Check if functions are defined in script.js (via page.evaluate)
        # We need to wait a bit for script.js to load
        page.wait_for_timeout(2000)

        is_populate_defined = page.evaluate("typeof populateDynamicSelectors === 'function'")
        print(f"populateDynamicSelectors defined: {is_populate_defined}")

        page.screenshot(path="verification/final_check.png")
        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    run_verification()
