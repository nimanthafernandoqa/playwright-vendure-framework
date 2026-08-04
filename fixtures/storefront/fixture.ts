// fixtures/storefront/fixture.ts
//
// Page Object fixtures available to BDD step definitions.
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

// Re-export for step files that import both `test` and `expect` here.
export { expect };
