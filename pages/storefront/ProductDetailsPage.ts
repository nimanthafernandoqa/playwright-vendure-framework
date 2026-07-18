import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object representing the selected product
 */
export class ProductDetailsPage {
  private readonly productTitleName: Locator;
  private readonly addToCartButton: Locator;

  constructor(private readonly page: Page) {
    this.productTitleName = page.getByRole('heading', { level: 1 });
    this.addToCartButton = page.getByRole('button', {name: 'add to Cart'});
    };


async verifyAddToCartButtonVisible(): Promise<void> {
  await expect(this.addToCartButton).toBeVisible();
}

async addProductToCart(): Promise<void> {
  await this.addToCartButton.click();
}


  async verifyProductTitle(expectedProductName: string): Promise<void> {
    console.log('${productTitleName}')
    await expect(this.productTitleName).toHaveText(expectedProductName);
}


}