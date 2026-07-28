import { expect, Locator, Page } from '@playwright/test';
import { HeaderComponent } from './components/HeaderComponent';

/**
 * Page Object for a single product's details page
 * ("/en/product/<slug>") — title, Add to Cart, and quantity handling.
 *
 * Exposes `header` (see components/HeaderComponent.ts) because the cart
 * icon/count in the site header is visible and relevant from this page
 * too; steps can assert on the cart count right after adding an item
 * without needing a separate Page Object reference.
 */
export class ProductDetailsPage {
  private readonly productTitleName: Locator;
  private readonly addToCartButton: Locator;
  readonly header: HeaderComponent;

  constructor(private readonly page: Page) {
    this.productTitleName = page.getByRole('heading', { level: 1 });
    this.addToCartButton = page.getByRole('button', { name: /add to cart/i });
    this.header = new HeaderComponent(page);
  }

  /**
   * Asserts the Add to Cart button is visible — use as a readiness check
   * before interacting with the page, e.g. after navigating from search.
   */
  async verifyAddToCartButtonVisible(): Promise<void> {
    await expect(this.addToCartButton).toBeVisible();
  }

  /**
   * Adds the given quantity of the current product to the cart by
   * clicking Add to Cart once per unit.
   *
   * IMPORTANT — a real UI constraint, not just a testing detail: after a
   * click, this button's accessible name flips from "Add to Cart" to
   * "Added to Cart" as UI feedback, and on this storefront it does not
   * revert — i.e. the button only supports being clicked once per page
   * visit. Requesting quantity > 1 here will therefore fail *on purpose*,
   * quickly and with an explicit message, rather than silently hanging
   * for the full test timeout waiting for a state that will never come
   * back. If you need quantity > 1 for a product, add it once here, then
   * increase the quantity from the cart page itself
   * (see ShoppingCartPage — currently only exposes decrease/remove;
   * add an increase() there first if you need this).
   *
   * @param quantity Number of units to add (in practice: 0 or 1 given the
   *   constraint above; loop exists to fail clearly if a caller assumes
   *   otherwise).
   */
  async addProductToCart(quantity: number): Promise<void> {
    for (let i = 0; i < quantity; i++) {
      await expect(
        this.addToCartButton,
        `"Add to Cart" did not become clickable again after ${i} click(s). ` +
          `This product page may only support adding a single unit per visit — ` +
          `use the cart's own quantity control to add more of the same item.`,
      ).toBeVisible({ timeout: 5_000 });

      await this.addToCartButton.click();
    }
  }

  /**
   * Asserts the page's <h1> matches the expected product name — a
   * stronger check than "we're on *a* product page", confirming we're on
   * the *right* one.
   */
  async verifyProductTitle(expectedProductName: string): Promise<void> {
    await expect(this.productTitleName).toHaveText(expectedProductName);
  }

  /**
   * Leaves the product details page for the search/listing page.
   *
   * Note: despite the name, this does a fresh navigation to "/en/search"
   * rather than using browser back navigation (page.goBack()). That's
   * intentional — search is the entry point every scenario in this suite
   * uses to reach a product (see HomePage.searchForProduct), so returning
   * to search is the reliable "back to where I can pick another product"
   * action regardless of how this page was actually reached.
   */
  async goBackToProductList(): Promise<void> {
    await this.page.goto('/en/search');
    await this.page.waitForURL(/\/en\/search/);
  }
}
