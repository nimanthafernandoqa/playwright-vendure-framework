// fixtures/storefront/fixture.ts
//
// A Playwright "fixture" is a reusable piece of test setup that Playwright
// constructs for you and injects into every test/step function that asks
// for it by name — similar in spirit to dependency injection. Here, each
// Page Object gets its own fixture so that step definitions (see
// steps/storefront/*.steps.ts) can simply declare e.g. `{ homePage }` as a
// parameter instead of manually `new HomePage(page)`-ing it everywhere.
//
// This file extends playwright-bdd's own `test` (not @playwright/test's
// directly) — that's what makes these fixtures available inside Given/
// When/Then step definitions via createBdd(test), not just inside
// traditional test() blocks.
import { test as base } from 'playwright-bdd';
import { expect } from '@playwright/test';

import { HomePage } from '../../pages/storefront/HomePage';
import { ProductListPage } from '../../pages/storefront/ProductListPage';
import { ProductDetailsPage } from '../../pages/storefront/ProductDetailsPage';
import { ShoppingCartPage } from '../../pages/storefront/ShoppingCartPage';
import { CheckoutPage } from '../../pages/storefront/CheckoutPage';
import { HeaderComponent } from '../../pages/storefront/components/HeaderComponent';

/**
 * Fixture names available to every step definition that uses this `test`
 * (via createBdd(test) — see steps/storefront/cart.steps.ts). Add a new
 * entry here whenever a new Page Object needs to be usable from a step.
 */
type StorefrontFixtures = {
  homePage: HomePage;
  productListPage: ProductListPage;
  productDetailsPage: ProductDetailsPage;
  shoppingCartPage: ShoppingCartPage;
  checkoutPage: CheckoutPage;
  headerComponent: HeaderComponent;
};

// Each fixture below follows the same pattern: construct the Page Object
// against the current test's `page`, then hand it to `use()`. Playwright
// creates a fresh instance per test, so Page Objects never leak state
// between tests even though they're declared once here.
export const test = base.extend<StorefrontFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  productListPage: async ({ page }, use) => {
    await use(new ProductListPage(page));
  },

  productDetailsPage: async ({ page }, use) => {
    await use(new ProductDetailsPage(page));
  },

  shoppingCartPage: async ({ page }, use) => {
    await use(new ShoppingCartPage(page));
  },

  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  headerComponent: async ({ page }, use) => {
    await use(new HeaderComponent(page));
  },
});

// Re-exported so step definitions can `import { expect } from
// '../../fixtures/storefront/fixture'` alongside `test`, without a second
// import from @playwright/test.
export { expect };
