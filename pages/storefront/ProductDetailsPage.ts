import { expect, Locator, Page } from '@playwright/test';
import { HeaderComponent } from './components/HeaderComponent';
/**
 * Page Object representing the selected product
 */
export class ProductDetailsPage {
  private readonly productTitleName: Locator;
  private readonly addToCartButton: Locator;
 readonly header: HeaderComponent;



  constructor(private readonly page: Page) {
    this.productTitleName = page.getByRole('heading', { level: 1 });
    this.addToCartButton = page.getByRole('button', {name: 'add to Cart'});
    this.header = new HeaderComponent(page);
    };


async verifyAddToCartButtonVisible(): Promise<void> {
  await expect(this.addToCartButton).toBeVisible();
}

/**
 * Adds the requested quantity of the current product to the cart.
 *
 * @param quantity Number of times the product should be added.
 */
async addProductToCart(quantity: number): Promise<void> {
  // Click the Add to Cart button once for each requested item.
  for (let i = 0; i < quantity; i++) {
    await this.addToCartButton.click();
  }
}
//Verify the product name
  async verifyProductTitle(expectedProductName: string): Promise<void> {
    console.log('${productTitleName}')
    await expect(this.productTitleName).toHaveText(expectedProductName);
}

/**
 * Returns from the Product Details page to the Product List page.
 */
async goBackToProductList(): Promise<void> {
  // Return to the previous page.
  await this.page.goBack();

  // Wait until the Product List page has loaded again.
  await this.page.waitForURL(/collections|search/);
}


}