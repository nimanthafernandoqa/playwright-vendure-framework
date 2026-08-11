import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the Vendure storefront home page.
 *
 * Responsible only for what's reachable *from* the home page: opening it,
 * confirming it loaded, navigating into the catalogue via "Shop Now", and
 * running a product search (the storefront's search page is reached via a
 * search box that lives in the home page's header).
 */
export class HomePage {
  private readonly shopNowButton: Locator;
  private readonly searchBox: Locator;

  constructor(private readonly page: Page) {
    this.shopNowButton = page.getByRole('button', {
      name: 'Shop Now',
    });

    this.searchBox = page.getByPlaceholder('Search products...');
  }

  /**
   * Navigates to the storefront root ("/"). Combine with
   * verifyHomePageLoaded() before interacting with the page — a fresh
   * navigation doesn't guarantee the client-side app has hydrated yet.
   */
  async open(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Clicks "Shop Now" to enter the product catalogue (collections page).
   */
  async clickShopNow(): Promise<void> {
    await this.shopNowButton.click();
  }

  /**
   * Asserts the home page has rendered its primary call-to-action.
   * Use this as a readiness check after open() before any interaction.
   */
  async verifyHomePageLoaded(): Promise<void> {
    await expect(this.shopNowButton).toBeVisible();
  }

  /**
   * Asserts we've navigated away from the home page ("/" or "/en") to
   * somewhere else in the storefront (e.g. after clicking Shop Now).
   */
  async verifyShopPageOpened(): Promise<void> {
    await expect(this.page).not.toHaveURL(/\/en\/?$/);
  }

  /**
   * Searches for a product by name and waits until its result card is
   * visible on the search results page ("/en/search").
   *
   * Retries the submit + assertion sequence because the search page can
   * briefly show the previous result set while the new query renders.
   *
   * @param product Exact product name to search for and expect a result for.
   */
  async searchForProduct(product: string): Promise<void> {
    await this.page.goto('/en/search', { waitUntil: 'domcontentloaded' });

    const productCard = this.page.locator('a[href^="/en/product/"]').filter({
      has: this.page.getByRole('heading', {
        name: product,
        exact: true,
      }),
    });

    if (!(await this.searchBox.isVisible())) {
      await this.page.goto(`/en/search?q=${encodeURIComponent(product)}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(productCard).toBeVisible({ timeout: 10_000 });
      return;
    }

    await expect(this.searchBox).toBeEditable();

    await expect(async () => {
      await this.searchBox.fill('');
      await this.searchBox.fill(product);
      await expect(this.searchBox).toHaveValue(product);

      await this.searchBox.press('Enter');

      await expect(productCard).toBeVisible({ timeout: 5_000 });
    }).toPass({
      timeout: 20_000,
    });
  }
}
