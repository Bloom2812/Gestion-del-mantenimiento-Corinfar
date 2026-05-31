
import os
from playwright.sync_api import sync_playwright

def verify_manual_full():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Open the local HTML file
        file_path = "file://" + os.path.abspath("MANUAL_USUARIO.html")
        page.goto(file_path)

        # Take a screenshot of the whole page (or a large portion) to see the structure
        page.set_viewport_size({"width": 1280, "height": 3000})
        page.screenshot(path="verification/manual_structure_check.png")

        # Verify sidebar links
        sidebar_links = page.locator(".sidebar a")
        print(f"Found {sidebar_links.count()} sidebar links")

        # Check if "Guía del Jefe de Área" is there
        jefe_link = page.get_by_role("link", name="Guía del Jefe de Área")
        if jefe_link.is_visible():
            print("Jefe de Área link is visible in sidebar")
        else:
            print("Jefe de Área link NOT found in sidebar")

        # Check renumbering of subsequent sections
        seguridad_h2 = page.locator("h2:has-text('6. Seguridad')")
        if seguridad_h2.is_visible():
            print("Section 6. Seguridad found correctly renumbered")
        else:
            print("Section 6. Seguridad NOT found or wrongly numbered")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    verify_manual_full()
