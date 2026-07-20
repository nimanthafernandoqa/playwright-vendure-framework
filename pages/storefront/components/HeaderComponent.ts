import { expect, type Locator, type Page } from '@playwright/test';

export class HeaderComponent {
  readonly cartButton: Locator;

  constructor(private readonly page: Page) {
    this.cartButton = page.getByRole('button', {
      name: /Shopping Cart/i,
    });
  }

  async verifyCartCount(expectedCount: number): Promise<void> {
    await expect(this.cartButton).toHaveAccessibleName(
      `${expectedCount} Shopping Cart`
    );
  }

  async openCart(): Promise<void> {
    await this.cartButton.click();
    await this.page.waitForURL(/\/en\/cart$/);
  }
}