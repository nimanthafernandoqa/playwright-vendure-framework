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

    this.searchBox = page.getByRole('searchbox', {
      name: 'Search products...',
    });
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
   * Known flakiness this method guards against: this storefront is a
   * client-rendered app, so typing + Enter doesn't guarantee the results
   * grid has re-rendered by the time we check for a specific card — this
   * is especially true for the *second+* search within a single test,
   * where the previous product's results are still on screen and take a
   * moment to be swapped out. Rather than adding a fixed sleep (fragile:
   * too short and it's still flaky, too long and every test gets slower),
   * the whole "type -> submit -> assert" sequence is wrapped in `toPass`
   * so it retries as a unit — including re-submitting the search — until
   * the expected product card appears or the overall timeout is hit.
   *
   * @param product Exact product name to search for and expect a result for.
   */
  async searchForProduct(product: string): Promise<void> {
    await this.page.goto('/en/search');

    await expect(this.searchBox).toBeVisible();
    await expect(this.searchBox).toBeEditable();

    const productCard = this.page.locator('a[href^="/en/product/"]').filter({
      has: this.page.getByRole('heading', {
        name: product,
        exact: true,
      }),
    });

    // Retry the whole fill -> Enter -> results sequence as one unit, not
    // just the fill. On the 1st search of a test the app has just finished
    // hydrating so it reacts quickly; on the 2nd+ search in the same test
    // it's swapping out the *previous* product's results, which can take
    // longer (debounce / re-render), so a single Enter press can fire
    // before the results update lands. Retrying the full sequence covers
    // both cases without guessing the exact timing.
    await expect(async () => {
      // Clear first in case a previous attempt left a partial/incorrect
      // value (e.g. hydration reset the controlled input mid-type).
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
