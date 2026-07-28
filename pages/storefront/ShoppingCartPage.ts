import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the cart page ("/en/cart") — asserting on and
 * modifying the items in it.
 *
 * Fragility note for future maintainers: several locators here
 * (cartItem, the +/- and remove buttons) are matched via Lucide icon
 * class names (`svg.lucide-x`, `svg.lucide-minus`) and a Tailwind
 * utility-class combination rather than test IDs, because none exist on
 * this storefront. These will break if the storefront's icon set or
 * layout classes change — if you get the chance to add `data-testid`
 * attributes to the app itself, prefer that over extending this pattern.
 */
export class ShoppingCartPage {
  private readonly cartHeading: Locator;
  private readonly removeItemButton: Locator;
  private readonly emptyCartHeading: Locator;

  constructor(private readonly page: Page) {
    this.cartHeading = page.getByRole('heading', {
      name: 'Shopping Cart',
    });

    this.removeItemButton = page.locator('button:has(svg.lucide-x)');

    this.emptyCartHeading = page.getByRole('heading', {
      name: /your cart is empty/i,
    });
  }

  /**
   * Asserts we're on the cart page and it has rendered. Call this before
   * any other cart interaction/assertion.
   */
  async verifyCartLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/cart$/);
    await expect(this.cartHeading).toBeVisible();
  }

  /**
   * Removes the item from the cart, asserting there is exactly one item
   * present first. Use this only when the cart is expected to contain a
   * single product; for a cart with multiple items use removeProduct()
   * with an explicit product name instead.
   */
  async removeOnlyProduct(): Promise<void> {
    await expect(this.removeItemButton).toHaveCount(1);
    await this.removeItemButton.click();
  }

  /**
   * Removes a specific product from the cart by name and confirms its
   * row is gone afterwards.
   *
   * @param productName Exact product name as shown in the cart line item.
   */
  async removeProduct(productName: string): Promise<void> {
    const item = this.cartItem(productName);

    const removeButton = item.locator('button:has(svg.lucide-x)');

    await removeButton.click();

    await expect(
      this.page.getByRole('link', {
        name: productName,
        exact: true,
      }),
    ).toHaveCount(0);
  }

  /**
   * Clicks a cart line item's "-" (decrease quantity) button the given
   * number of times.
   *
   * Each click triggers an async cart mutation (the displayed quantity
   * doesn't update instantly), so this deliberately waits for the
   * on-screen quantity to actually change after each click before
   * clicking again. Firing clicks back-to-back without that wait was
   * found to silently drop decrements — e.g. reducing by 2 in quick
   * succession could land on -1 instead of -2, because the second click
   * fired before the app had applied the first.
   *
   * @param productName Exact product name as shown in the cart line item.
   * @param amount How many times to click decrease (i.e. how much to
   *   reduce the quantity by).
   */
  async reduceProductQuantity(productName: string, amount: number): Promise<void> {
    const item = this.cartItem(productName);

    const decreaseButton = item.locator('button:has(svg.lucide-minus)');
    const quantity = item.locator('span.tabular-nums');

    for (let index = 0; index < amount; index++) {
      const before = await quantity.textContent();

      await decreaseButton.click();

      await expect(quantity).not.toHaveText(before ?? '');
    }
  }

  /**
   * Asserts the cart's empty state is showing (used after removing the
   * last/only item).
   */
  async verifyCartIsEmpty(): Promise<void> {
    await expect(this.emptyCartHeading).toBeVisible();
  }

  /**
   * Resolves a cart line item's container element from the product name
   * shown on it. Implementation detail: there's no dedicated "cart row"
   * test hook, so this walks up from the product name link to its
   * nearest ancestor `<div>` matching the row's known layout classes —
   * see the class-level fragility note above.
   */
  private cartItem(productName: string): Locator {
    return this.page
      .getByRole('link', { name: productName, exact: true })
      .locator('xpath=ancestor::div[contains(@class,"flex flex-col sm:flex-row")][1]');
  }

  /**
   * Asserts a specific cart line item shows the expected quantity.
   *
   * @param productName Exact product name as shown in the cart line item.
   * @param expectedQuantity Quantity that should currently be displayed.
   */
  async verifyProductQuantity(
    productName: string,
    expectedQuantity: number,
  ): Promise<void> {
    const item = this.cartItem(productName);

    await expect(item).toBeVisible();

    const quantity = item.locator('span.tabular-nums');

    await expect(quantity).toHaveText(String(expectedQuantity));
  }

  /**
   * Asserts a product does NOT appear anywhere in the cart — the
   * negative-case counterpart to verifyProductQuantity, used after a
   * removal to confirm it's really gone (not just reduced to 0).
   */
  async verifyProductNotPresent(productName: string): Promise<void> {
    await expect(
      this.page.getByRole('link', {
        name: productName,
        exact: true,
      }),
    ).toHaveCount(0);
  }
}
