import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Component Object for the site header's cart control — visible on
 * every storefront page, so this is composed into other Page Objects
 * (see ProductDetailsPage.header) rather than duplicating its locators.
 */
export class HeaderComponent {
  readonly cartButton: Locator;

  constructor(private readonly page: Page) {
    // The cart button's accessible name includes the live item count
    // (e.g. "2 Shopping Cart"), which is what verifyCartCount below
    // asserts on — there's no separate badge element to target.
    this.cartButton = page.getByRole('button', {
      name: /Shopping Cart/i,
    });
  }

  /**
   * Asserts the cart icon's item count matches what's expected. Reads
   * the count from the button's accessible name (see constructor note),
   * not a separate badge element.
   *
   * @param expectedCount Total item quantity the cart badge should show.
   */
  async verifyCartCount(expectedCount: number): Promise<void> {
    await expect(this.cartButton).toHaveAccessibleName(`${expectedCount} Shopping Cart`);
  }

  /**
   * Opens the cart. Deliberately does not assert on the resulting URL —
   * that's ShoppingCartPage.verifyCartLoaded()'s job, keeping "navigate"
   * and "verify" as separate, independently reusable steps.
   */
  async openCart(): Promise<void> {
    await expect(this.cartButton).toBeVisible();
    await this.cartButton.click();
    await this.page.waitForURL(/\/cart$/, { timeout: 10_000 });
  }
}
