import { test } from "@playwright/test";
import { HomePage } from "../../../pages/storefront/HomePage";
import { ProductListPage } from "../../../pages/storefront/ProductListPage";
import { ProductDetailsPage } from "../../../pages/storefront/ProductDetailsPage";
import { productTestData } from "../../../test-data/storefront/products";

test.describe("Vendure storefront", () => {
  // Declare Page Objects once so they can be reused by every test
  // in this describe block.
  let homePage: HomePage;
  let productListPage: ProductListPage;
  let productDetailsPage: ProductDetailsPage;

  /**
   * Runs before every test.
   */
  test.beforeEach(async ({ page }) => {
    // Create fresh Page Object instances for this browser session.
    homePage = new HomePage(page);
    productListPage = new ProductListPage(page);
    productDetailsPage = new ProductDetailsPage(page);

    // Navigate to the application.
    await homePage.open();

    // Verify the homepage is fully loaded before performing any actions.
    await homePage.verifyHomePageLoaded();
  });

  /**
   * Test Scenario:
   * Verify that a guest user can successfully add a product
   * to the shopping cart.
   */
  test("guest can add a product to the cart", async () => {
    // Get the first product object from the external test data.
    const product = productTestData.products[0];

    // Navigate from the homepage to the product listing.
    await homePage.clickShopNow();

    // Confirm the Product List page loaded successfully.
    await productListPage.verifyProductListLoaded();
    await productListPage.verifyProductsExist();

    // Open the product defined in the test data.
    await productListPage.openProduct(product.name);

    // Ensure the Product Details page has loaded.
    await productDetailsPage.verifyAddToCartButtonVisible();

    // Add the quantity defined in the test data.
    await productDetailsPage.addProductToCart(product.quantity);

    // Verify the cart badge displays the expected total quantity.
    await productDetailsPage.header.verifyCartCount(product.quantity);

    // Open the shopping cart.
    await productDetailsPage.header.openCart();
  });

  test("guest can add multiple products with different quantities", async () => {
    // Navigate from the homepage to the product listing.
    await homePage.clickShopNow();

    // Verify that the Product List page has loaded successfully.
    await productListPage.verifyProductListLoaded();
    await productListPage.verifyProductsExist();

    // Iterate through every product defined in the external test data.
    for (let index = 0; index < productTestData.products.length; index++) {
      // Retrieve the current product from the test data.
      const product = productTestData.products[index];

      // Open the selected product by its name.
      await productListPage.openProduct(product.name);

      // Ensure the Product Details page is fully loaded before interacting with it.
      await productDetailsPage.verifyAddToCartButtonVisible();

      // Add the required quantity of the current product to the shopping cart.
      await productDetailsPage.addProductToCart(product.quantity);

      // Determine whether the current product is the last one in the test data.
      const isLastProduct = index === productTestData.products.length - 1;

      // Return to the Product List only when another product still needs to be added.
      if (!isLastProduct) {
        await productDetailsPage.goBackToProductList();

        // Confirm the Product List page has loaded before selecting the next product.
        await productListPage.verifyProductListLoaded();
      }
    }

    // Calculate the expected cart quantity by summing the quantities
    // defined in the external test data.
    const expectedCartCount = productTestData.products.reduce(
      (total, product) => total + product.quantity,
      0,
    );

    // Verify the shopping cart badge displays the expected total quantity.
    await productDetailsPage.header.verifyCartCount(expectedCartCount);

    // Open the shopping cart.
    await productDetailsPage.header.openCart();
  });
});
