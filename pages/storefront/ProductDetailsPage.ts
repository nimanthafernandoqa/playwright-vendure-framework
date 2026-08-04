import { expect, Locator, Page } from '@playwright/test';
import { HeaderComponent } from './components/HeaderComponent';
import { ShoppingCartPage } from './ShoppingCartPage';

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
  private readonly shoppingCartPage: ShoppingCartPage;

  constructor(private readonly page: Page) {
    this.productTitleName = page.getByRole('heading', { level: 1 });
    this.addToCartButton = page.getByRole('button', { name: /add to cart/i });
    this.header = new HeaderComponent(page);
    this.shoppingCartPage = new ShoppingCartPage(page);
  }

  /**
   * Asserts the Add to Cart button is visible — use as a readiness check
   * before interacting with the page, e.g. after navigating from search.
   */
  async verifyAddToCartButtonVisible(): Promise<void> {
    await expect(this.addToCartButton).toBeVisible();
  }

  /**
   * Adds the given quantity of the current product to the cart.
   *
   * A real UI constraint, not just a testing detail: the button only
   * supports being clicked once per page visit (its label runs through
   * "Add to Cart" → "Adding..." → back to "Add to Cart" — confirmed live
   * that it reverts rather than settling on "Added to Cart", so button
   * text can't be used as a completion signal; a toast briefly appears
   * instead, but that's transient and not worth depending on either). So
   * quantity is handled in two parts: one "Add to Cart" click gets the
   * first unit in, then any remainder is added from the cart page's own
   * "+" control (see ShoppingCartPage.increaseProductQuantity).
   *
   * @param quantity Total number of units to end up with in the cart.
   */
  async addProductToCart(quantity: number): Promise<void> {
    await expect(this.addToCartButton).toBeVisible();

    // Adding to cart is an async mutation on this storefront (confirmed
    // live: the button passes through a disabled "Adding..." state before
    // settling). The one durable, non-transient signal that it actually
    // completed is the header cart count changing, so capture it before
    // clicking and wait for it to differ afterwards — the same
    // before/after-text-diff pattern already used for the cart page's own
    // +/- controls (see ShoppingCartPage.reduceProductQuantity). Without
    // this wait, callers that immediately act on the cart (e.g. opening
    // it) can race the mutation and observe a stale/empty cart.
    const cartCountBefore = (await this.header.cartButton.textContent()) ?? '';

    await this.addToCartButton.click();

    await expect(async () => {
      const cartCountAfter = (await this.header.cartButton.textContent()) ?? '';
      expect(cartCountAfter).not.toBe(cartCountBefore);
    }).toPass({ timeout: 10_000 });

    if (quantity > 1) {
      const productName = (await this.productTitleName.textContent())?.trim();

      if (!productName) {
        throw new Error('Could not resolve the current product name from the details page.');
      }

      await this.header.openCart();
      await this.shoppingCartPage.verifyCartLoaded();
      await this.shoppingCartPage.increaseProductQuantity(productName, quantity - 1);
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
