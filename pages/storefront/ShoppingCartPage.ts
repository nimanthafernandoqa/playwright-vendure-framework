import { expect, Locator, Page } from '@playwright/test';

/**
 * Page Object for the cart page ("/en/cart") — asserting on and
 * modifying the items in it.
 *
 * Some locators use icon classes and layout classes because the storefront
 * does not expose test IDs for cart rows/actions.
 */
export class ShoppingCartPage {
  private readonly cartHeading: Locator;
  private readonly removeItemButton: Locator;
  private readonly emptyCartHeading: Locator;
  private readonly proceedToCheckoutButton: Locator;

  constructor(private readonly page: Page) {
    this.cartHeading = page.getByRole('heading', {
      name: 'Shopping Cart',
    });

    this.removeItemButton = page.locator('button:has(svg.lucide-x)');

    this.emptyCartHeading = page.getByRole('heading', {
      name: /your cart is empty/i,
    });

    this.proceedToCheckoutButton = page.getByRole('button', {
      name: 'Proceed to Checkout',
      exact: true,
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
   *
   * The click is retried until the row is actually gone. Confirmed live
   * via a real CI failure (on removeProduct(), same underlying pattern):
   * a remove click can be lost if it fires while a *different*, preceding
   * cart mutation is still settling. Unlike Add to Cart, retrying here is
   * safe — remove has no side effect to duplicate; clicking it again
   * after it already succeeded simply finds nothing left to click.
   */
  async removeOnlyProduct(): Promise<void> {
    await expect(this.removeItemButton).toHaveCount(1);

    await expect(async () => {
      if ((await this.removeItemButton.count()) > 0) {
        await this.removeItemButton.click({ timeout: 2_000 }).catch(() => {});
      }
      await expect(this.removeItemButton).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Removes a specific product from the cart by name and confirms its
   * row is gone afterwards.
   *
   * The click is retried until the row is actually gone — see
   * removeOnlyProduct() above for why that's safe here specifically.
   * Confirmed live via a real CI failure: "Guest updates and removes
   * multiple products from the cart" removes Basketball right after
   * reducing Aloe Vera's quantity in the same step, and the remove click
   * was lost — the preceding row's mutation re-rendering the list was
   * still in flight when this click fired. A plain single click had no
   * way to recover from that; retrying does.
   *
   * @param productName Exact product name as shown in the cart line item.
   */
  async removeProduct(productName: string): Promise<void> {
    const item = this.cartItem(productName);
    const removeButton = item.locator('button:has(svg.lucide-x)');
    const productLink = this.page.getByRole('link', {
      name: productName,
      exact: true,
    });

    await expect(async () => {
      if ((await removeButton.count()) > 0) {
        await removeButton.click({ timeout: 2_000 }).catch(() => {});
      }
      await expect(productLink).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
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
   * Each click+wait is itself retried (same pattern as removeProduct()
   * above): confirmed via a real local run where the very first decrease
   * click on a freshly-loaded cart page had no effect — the quantity
   * stayed unchanged for the full assertion timeout — because the page's
   * client-side app hadn't finished hydrating when the click fired.
   * Retrying re-clicks in that case; it's safe because a click that
   * already succeeded just finds nothing left to change.
   *
   * @param productName Exact product name as shown in the cart line item.
   * @param amount How many times to click decrease (i.e. how much to
   *   reduce the quantity by).
   */
  async reduceProductQuantity(productName: string, amount: number): Promise<void> {
    const item = this.cartItem(productName);

    const decreaseButton = item.locator('button:has(svg.lucide-minus)');
    const quantity = item.locator('span.tabular-nums');

    await expect(async () => {
      await expect(item).toBeVisible({ timeout: 2_000 });
      await expect(quantity).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    for (let index = 0; index < amount; index++) {
      const before = (await quantity.textContent())?.trim() ?? '';

      await expect(async () => {
        await decreaseButton.click({ timeout: 2_000 });
        await expect(quantity).not.toHaveText(before, { timeout: 2_000 });
      }).toPass({ timeout: 15_000 });
    }
  }

  /**
   * Clicks a cart line item's "+" (increase quantity) button the given
   * number of times.
   *
   * Each click+wait is retried — see reduceProductQuantity() above for
   * why (same hydration/timing risk applies to both buttons).
   *
   * @param productName Exact product name as shown in the cart line item.
   * @param amount How many times to click increase.
   */
  async increaseProductQuantity(productName: string, amount: number): Promise<void> {
    const item = this.cartItem(productName);

    const increaseButton = item.locator('button:has(svg.lucide-plus)');
    const quantity = item.locator('span.tabular-nums');

    await expect(async () => {
      await expect(item).toBeVisible({ timeout: 2_000 });
      await expect(quantity).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    for (let index = 0; index < amount; index++) {
      const before = (await quantity.textContent())?.trim() ?? '';

      await expect(async () => {
        await increaseButton.click({ timeout: 2_000 });
        await expect(quantity).not.toHaveText(before, { timeout: 2_000 });
      }).toPass({ timeout: 15_000 });
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
   * Leaves the cart for the checkout wizard ("/en/checkout"). Despite its
   * href, this is rendered as a <button> here, not a plain link.
   */
  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
    await this.page.waitForURL(/\/checkout$/);
  }

  /**
   * Resolves a cart line item's container element from the product name
   * shown on it. Implementation detail: there's no dedicated "cart row"
   * test hook, so this walks up from the product name link to its
   * nearest ancestor `<div>` matching the row's known layout classes —
   * see the class-level fragility note above.
   *
   * The XPath walk stops at the nearest matching ancestor to avoid
   * strict-mode violations from matching every wrapper around the row.
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

    await expect(async () => {
      await expect(item).toBeVisible({ timeout: 2_000 });
      await expect(item.locator('span.tabular-nums')).toHaveText(
        String(expectedQuantity),
        { timeout: 2_000 },
      );
    }).toPass({ timeout: 15_000 });
  }

  /**
   * Verifies the total quantity across the cart page by summing each row's
   * visible quantity badge. This is a more stable assertion than reading the
   * header badge, because the header counter can lag behind the actual cart
   * line-item DOM after a mutation.
   */
  async verifyCartTotalQuantity(expectedQuantity: number): Promise<void> {
    const quantitySpans = this.page.locator('span.tabular-nums');

    await expect(async () => {
      await expect(quantitySpans.first()).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    const values = await quantitySpans.allTextContents();
    const total = values.reduce((sum, value) => {
      const parsed = Number.parseInt(value.trim(), 10);
      return Number.isNaN(parsed) ? sum : sum + parsed;
    }, 0);

    expect(total).toBe(expectedQuantity);
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
