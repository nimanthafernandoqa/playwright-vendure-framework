import { expect, Locator, Page } from "@playwright/test";

/**
 * Page Object representing the product listing page.
 */
export class ProductListPage {
  private readonly productCards: Locator;

  constructor(private readonly page: Page) {
    this.productCards = page.locator('a[href^="/en/product/"]');
  }

  /**
   * Verifies that the product listing page has loaded.
   */
  async verifyProductListLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/collections|search/);
    await expect(this.productCards.first()).toBeVisible();
  }

  /**
   * Returns the number of displayed products.
   */
  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  /**
   * Verifies that at least one product is displayed.
   */
  async verifyProductsExist(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  /**
   * Opens the first displayed product.
   *
   * @returns The selected product name.
   */
  async openFirstProduct(): Promise<string> {
    const firstProduct = this.productCards.first();
    const productName = await firstProduct.locator("h3").innerText();
    await firstProduct.click();
    //after clicking , this will wait till the page loads
    await this.page.waitForURL(/\/en\/product\/.+/);
    return productName.trim();
  }

  /**
   * Opens a product using the name supplied by the test data.
   *
   * @param productName The exact product name to open.
   * @returns Resolves when the Product Details page has loaded.
   */
  async openProduct(productName: string): Promise<void> {
    // Find the product card that contains the requested product name.
    const productCard = this.productCards.filter({
      has: this.page.getByRole("heading", {
        name: productName,
        exact: true,
      }),
    });

    // Fail with a clear assertion if the product is not displayed.
    await expect(productCard).toBeVisible();

    // Open the matching product.
    await productCard.click();

    // Wait until navigation to the Product Details page completes.
    await this.page.waitForURL(/\/en\/product\/.+/);
  }
}
