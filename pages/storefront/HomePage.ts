import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object representing the Vendure Storefront home page.
 */
export class HomePage {
  private readonly shopNowButton: Locator;

  constructor(private readonly page: Page) {
    this.shopNowButton = page.getByRole('button', {
      name: 'Shop Now',
    });
  }

  /**
   * Opens the storefront home page.
   */
  async open(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Clicks the "Shop Now" button to navigate to the product collection.
   */
  async clickShopNow(): Promise<void> {
    await this.shopNowButton.click();
  }

  /**
   * Verifies the home page has loaded successfully.
   */
  async verifyHomePageLoaded(): Promise<void> {
    await expect(this.shopNowButton).toBeVisible();
  }

  /**
 * Verifies that the user has navigated away from the home page
 * to a shopping or collection page.
 */
async verifyShopPageOpened(): Promise<void> {
  await expect(this.page).not.toHaveURL(/\/en\/?$/);
}
}