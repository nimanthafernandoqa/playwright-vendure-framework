import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for any page that renders a grid of product cards — used
 * for both the collections/catalogue page and the search results page
 * (both render the same `<a href="/en/product/...">` card markup, so one
 * Page Object covers both entry points).
 */
export class ProductListPage {
  private readonly productCards: Locator;

  constructor(private readonly page: Page) {
    // All product cards link to "/en/product/<slug>" regardless of which
    // listing page they're rendered on — matching on that href pattern
    // (rather than a CSS class) keeps this locator stable across page
    // types and across storefront styling changes.
    this.productCards = page.locator('a[href^="/en/product/"]');
  }

  /**
   * Asserts we're on a listing page (collections or search results) and
   * that at least one product card has rendered. Call this after any
   * navigation that's expected to land on a product grid.
   */
  async verifyProductListLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/collections|search/);
    await expect(this.productCards.first()).toBeVisible();
  }

  /**
   * Returns how many product cards are currently rendered.
   */
  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  /**
   * Asserts the listing rendered at least one product card, without
   * asserting anything about the current URL (use verifyProductListLoaded
   * for the stronger check).
   */
  async verifyProductsExist(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  /**
   * Opens whichever product card is first in the grid. Useful when the
   * test doesn't care which product it is, only that "some product" can
   * be opened. Not currently used by any scenario, kept for future
   * exploratory/smoke tests.
   *
   * @returns The name of the product that was opened.
   */
  async openFirstProduct(): Promise<string> {
    const firstProduct = this.productCards.first();
    const productName = await firstProduct.locator('h3').innerText();
    await firstProduct.click();
    // Wait for the click's navigation to actually land on a product page
    // before returning, so callers don't have to worry about timing.
    await this.page.waitForURL(/\/en\/product\/.+/);
    return productName.trim();
  }

  /**
   * Opens a specific product by its exact displayed name.
   *
   * @param productName The exact product name shown in its card heading.
   */
  async openProduct(productName: string): Promise<void> {
    // Find the product card that contains the requested product name.
    const productCard = this.productCards.filter({
      has: this.page.getByRole('heading', {
        name: productName,
        exact: true,
      }),
    });

    // Fail with a clear assertion if the product is not displayed, rather
    // than letting the click below fail with a less obvious timeout.
    await expect(productCard).toBeVisible();

    // Open the matching product.
    await productCard.click();

    // Wait until navigation to the Product Details page completes.
    await this.page.waitForURL(/\/en\/product\/.+/);
  }
}
