// steps/storefront/cart.steps.ts
//
// Step definitions implementing the Gherkin steps used in
// features/storefront/cart.feature. Each Given/When/Then here maps one
// piece of plain-English scenario text to Page Object calls — this file
// should stay thin: it orchestrates, the Page Objects (pages/storefront/)
// hold the actual locators and interaction/assertion logic.
import { expect } from '@playwright/test';
import { createBdd, DataTable } from 'playwright-bdd';
import { test } from '../../fixtures/storefront/fixture';

// createBdd(test) wires Given/When/Then to our extended `test` (see
// fixtures/storefront/fixture.ts), which is what makes fixtures like
// `homePage` and `productListPage` available as step parameters below.
const { Given, When, Then } = createBdd(test);

// --- Navigation -------------------------------------------------------

Given('I am on the storefront home page', async ({ homePage }) => {
  await homePage.open();
  await homePage.verifyHomePageLoaded();
});

Given('I am viewing the product list', async ({ homePage, productListPage }) => {
  await homePage.clickShopNow();
  await productListPage.verifyProductListLoaded();
  await productListPage.verifyProductsExist();
});

// Functionally identical to the Given above — kept as a separate step
// because "When I go to the product list" reads more naturally mid-scenario
// (after some other action), whereas the Given form reads better as
// scenario setup. Both exist so scenario authors can pick whichever fits.
When('I go to the product list', async ({ homePage, productListPage }) => {
  await homePage.clickShopNow();
  await productListPage.verifyProductListLoaded();
  await productListPage.verifyProductsExist();
});

When(
  'I open the product {string}',
  async ({ productListPage, productDetailsPage }, productName: string) => {
    await productListPage.openProduct(productName);
    await productDetailsPage.verifyProductTitle(productName);
  },
);

When(
  'I search for the product {string}',
  async ({ homePage, productListPage }, productName: string) => {
    await homePage.searchForProduct(productName);
    await productListPage.verifyProductListLoaded();
    await productListPage.verifyProductsExist();
  },
);

Then(
  'the search results should show {string}',
  async ({ page }, productName: string) => {
    await expect(page.getByRole('heading', { name: productName, exact: true })).toBeVisible();
  },
);

When('I open the cart from the header', async ({ headerComponent, shoppingCartPage }) => {
  await headerComponent.openCart();
  await shoppingCartPage.verifyCartLoaded();
});

// --- Adding to cart -----------------------------------------------------

When(
  'I add {int} of the product to the cart',
  async ({ productDetailsPage }, quantity: number) => {
    await productDetailsPage.verifyAddToCartButtonVisible();
    await productDetailsPage.addProductToCart(quantity);
  },
);

// Data-table step: drives the Gherkin table of `| product | quantity |`
// rows straight from the .feature file, one product at a time. Each
// product is located via search (not the currently-open listing page),
// since after adding the previous product we're on its Product Details
// page, not a listing — searching is the reliable way back into a state
// where a *specific* product can be opened next.
When(
  'I add the following products to the cart:',
  async ({ homePage, productDetailsPage, productListPage }, table: DataTable) => {
    for (const { product, quantity } of table.hashes()) {
      const parsedQuantity = Number.parseInt(quantity, 10);

      // Fail with a clear, specific error if the feature file has a typo
      // in the quantity column, instead of silently coercing NaN into
      // addProductToCart() and getting a confusing downstream failure.
      if (Number.isNaN(parsedQuantity)) {
        throw new Error(`Invalid quantity "${quantity}" for product "${product}"`);
      }

      await homePage.searchForProduct(product);
      await productListPage.openProduct(product);
      await productDetailsPage.addProductToCart(parsedQuantity);
    }
  },
);

Then(
  'the cart should contain {int} items',
  async ({ headerComponent, shoppingCartPage }, expectedCount: number) => {
    await headerComponent.openCart();
    await shoppingCartPage.verifyCartLoaded();
    await shoppingCartPage.verifyCartTotalQuantity(expectedCount);
  },
);

// --- Removing / updating cart contents -----------------------------------

When(
  'I remove the product from the cart',
  async ({ shoppingCartPage, headerComponent }) => {
    await headerComponent.openCart();
    await shoppingCartPage.verifyCartLoaded();
    await shoppingCartPage.removeOnlyProduct();
  },
);

Then('the cart should be empty', async ({ shoppingCartPage }) => {
  await shoppingCartPage.verifyCartIsEmpty();
});

// Data-table step supporting two actions per row ("reduce" by an amount,
// or "remove" outright) so a single Gherkin table can express a mixed
// set of cart edits in one readable step, e.g.:
//   | product    | action | value |
//   | Aloe Vera  | reduce | 1     |
//   | Basketball | remove |       |
When(
  'I update the cart as follows:',
  async ({ headerComponent, shoppingCartPage }, table: DataTable) => {
    await headerComponent.openCart();
    await shoppingCartPage.verifyCartLoaded();

    const rows = table.hashes();

    for (const { product, action, value } of rows) {
      switch (action.trim().toLowerCase()) {
        case 'reduce': {
          const reductionAmount = Number.parseInt(value, 10);

          if (Number.isNaN(reductionAmount)) {
            throw new Error(
              `Invalid reduction value "${value}" for product "${product}"`,
            );
          }

          await shoppingCartPage.reduceProductQuantity(product, reductionAmount);
          break;
        }

        case 'remove':
          await shoppingCartPage.removeProduct(product);
          break;

        // Catches a typo'd action in the feature file (e.g. "remvoe")
        // at step-execution time with a clear message, rather than
        // silently doing nothing for that row.
        default:
          throw new Error(`Unsupported cart action "${action}" for product "${product}"`);
      }
    }
  },
);

Then('the cart should contain:', async ({ shoppingCartPage }, table: DataTable) => {
  const rows = table.hashes();

  for (const { product, quantity } of rows) {
    const expectedQuantity = Number.parseInt(quantity, 10);

    if (Number.isNaN(expectedQuantity)) {
      throw new Error(`Invalid expected quantity "${quantity}" for product "${product}"`);
    }

    await shoppingCartPage.verifyProductQuantity(product, expectedQuantity);
  }
});

Then(
  '{string} should not exist in the cart',
  async ({ shoppingCartPage }, product: string) => {
    await shoppingCartPage.verifyProductNotPresent(product);
  },
);
