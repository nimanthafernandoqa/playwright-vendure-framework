import { expect, Locator, Page } from '@playwright/test';

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
   ;

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
    const productName = await firstProduct.locator('h3').innerText();
    await firstProduct.click();
    //after clicking , this will wait till the page loads
    await this.page.waitForURL(/\/en\/product\/.+/);
    return productName.trim();
}




}