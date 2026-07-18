import { test } from '@playwright/test';
import { HomePage } from '../../../pages/storefront/HomePage';
import { ProductListPage } from '../../../pages/storefront/ProductListPage';
import { ProductDetailsPage } from '../../../pages/storefront/ProductDetailsPage';

test.describe('Vendure storefront home page', () => {
  test('guest can open the shop from the home page', async ({ page }) => {
    const homePage = new HomePage(page);
    const productListPage = new ProductListPage(page);
    const productDetailsPage = new ProductDetailsPage(page);

    await homePage.open();
    await homePage.verifyHomePageLoaded();
    await homePage.clickShopNow();

    await productListPage.verifyProductListLoaded();
    await productListPage.verifyProductsExist();
    const productCount = await productListPage.getProductCount();
    console.log(`Products found: ${productCount}`);

    const selectedProduct = await productListPage.openFirstProduct();
    await productDetailsPage.verifyProductTitle(selectedProduct);
    await productDetailsPage.verifyAddToCartButtonVisible();
    await productDetailsPage.addProductToCart();

  });
  
});