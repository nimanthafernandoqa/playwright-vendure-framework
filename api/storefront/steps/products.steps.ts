import { createBdd } from 'playwright-bdd';
import {
  type ApiResult,
  expect,
  type ProductData,
  type ProductListData,
  test,
} from '../fixtures/api.fixture';
import { expectSuccessfulResult, shopApi } from '../helpers/shop-api';

const { Given, When, Then } = createBdd(test);

function getProductListResult(
  result: ApiResult<ProductListData> | undefined,
): ApiResult<ProductListData> {
  if (!result) {
    throw new Error('Expected a product list API result to be stored');
  }

  expectSuccessfulResult(result);
  return result;
}

function getProductResult(
  result: ApiResult<ProductData> | undefined,
): ApiResult<ProductData> {
  if (!result) {
    throw new Error('Expected a product API result to be stored');
  }

  expectSuccessfulResult(result);
  return result;
}

When('I request the product list from the Shop API', async ({ request, apiState }) => {
  apiState.productList = await shopApi<ProductListData>(
    request,
    `query Products {
      products {
        totalItems
        items {
          id
          name
          slug
        }
      }
    }`,
  );
});

Given('I have an existing product slug from the Shop API', async ({ request, apiState }) => {
  apiState.productList = await shopApi<ProductListData>(
    request,
    `query ProductSlugs {
      products {
        items {
          id
          name
          slug
        }
      }
    }`,
  );

  const productList = getProductListResult(apiState.productList);
  const firstProduct = productList.body.data?.products.items[0];

  if (!firstProduct) {
    throw new Error('Expected at least one product to exist');
  }

  apiState.selectedSlug = firstProduct.slug;
});

When('I request the product by that slug', async ({ request, apiState }) => {
  expect(apiState.selectedSlug, 'Expected an existing product slug').toBeDefined();

  apiState.productResult = await shopApi<ProductData>(
    request,
    `query ProductBySlug($slug: String) {
      product(slug: $slug) {
        id
        name
        slug
        description
      }
    }`,
    { slug: apiState.selectedSlug },
  );
});

When(
  'I request a product using the unknown slug {string}',
  async ({ request, apiState }, slug: string) => {
    apiState.selectedSlug = slug;
    apiState.productResult = await shopApi<ProductData>(
      request,
      `query ProductBySlug($slug: String) {
        product(slug: $slug) {
          id
          name
          slug
          description
        }
      }`,
      { slug },
    );
  },
);

Then('the Shop API response should be successful', async ({ apiState }) => {
  const latestResult =
    apiState.productResult ??
    apiState.productList ??
    apiState.activeOrderResult ??
    apiState.addItemResult ??
    apiState.productVariantResult ??
    apiState.loginResult;

  expectSuccessfulResult(latestResult);
});

Then('the product list should contain products', async ({ apiState }) => {
  const productList = getProductListResult(apiState.productList);
  const products = productList.body.data?.products;
  expect(products?.totalItems).toBeGreaterThan(0);
  expect(products?.items.length).toBeGreaterThan(0);
});

Then('every returned product should include id, name, and slug', async ({ apiState }) => {
  const productList = getProductListResult(apiState.productList);
  const items = productList.body.data?.products.items ?? [];

  for (const product of items) {
    expect(product.id).toBeTruthy();
    expect(product.name).toBeTruthy();
    expect(product.slug).toBeTruthy();
  }
});

Then('the returned product should match that slug', async ({ apiState }) => {
  const productResult = getProductResult(apiState.productResult);
  const product = productResult.body.data?.product;
  expect(product).not.toBeNull();
  expect(product?.slug).toBe(apiState.selectedSlug);
});

Then(
  'the returned product should include id, name, slug, and description',
  async ({ apiState }) => {
    const productResult = getProductResult(apiState.productResult);
    const product = productResult.body.data?.product;
    expect(product?.id).toBeTruthy();
    expect(product?.name).toBeTruthy();
    expect(product?.slug).toBeTruthy();
    expect(product?.description).toBeDefined();
  },
);

Then('no product should be returned', async ({ apiState }) => {
  const productResult = getProductResult(apiState.productResult);
  expect(productResult.body.data?.product).toBeNull();
});
