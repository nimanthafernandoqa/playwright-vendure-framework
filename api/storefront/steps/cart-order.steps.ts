import { type APIRequestContext } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import {
  type ActiveOrderData,
  type AddItemToOrderData,
  type ApiResult,
  expect,
  type ProductVariantData,
  test,
} from '../fixtures/api.fixture';
import { expectSuccessfulResult, shopApi } from '../helpers/shop-api';

const { Given, When, Then } = createBdd(test);

function getActiveOrderResult(
  result: ApiResult<ActiveOrderData> | undefined,
): ApiResult<ActiveOrderData> {
  if (!result) {
    throw new Error('Expected an active order API result to be stored');
  }

  expectSuccessfulResult(result);
  return result;
}

function getAddItemResult(
  result: ApiResult<AddItemToOrderData> | undefined,
): ApiResult<AddItemToOrderData> {
  if (!result) {
    throw new Error('Expected an add item API result to be stored');
  }

  expectSuccessfulResult(result);
  return result;
}

async function selectFirstProductVariantId(
  request: APIRequestContext,
  apiState: {
    productVariantResult?: ApiResult<ProductVariantData>;
    selectedVariantId?: string;
  },
): Promise<void> {
  const productList = await shopApi<{ products: { items: { slug: string }[] } }>(
    request,
    `query ProductSlugs {
      products(options: { take: 1 }) {
        items { slug }
      }
    }`,
  );

  expectSuccessfulResult(productList);

  const slug = productList.body.data?.products.items[0]?.slug;

  if (!slug) {
    throw new Error('Expected at least one product slug to exist');
  }

  apiState.productVariantResult = await shopApi<ProductVariantData>(
    request,
    `query ProductVariant($slug: String) {
      product(slug: $slug) {
        variants {
          id
        }
      }
    }`,
    { slug },
  );

  expectSuccessfulResult(apiState.productVariantResult);

  const variantId = apiState.productVariantResult.body.data?.product?.variants[0]?.id;

  if (!variantId) {
    throw new Error(`Expected product "${slug}" to have at least one variant`);
  }

  apiState.selectedVariantId = variantId;
}

async function addSelectedVariantToOrder(
  request: APIRequestContext,
  apiState: {
    selectedVariantId?: string;
    expectedQuantity?: number;
    addItemResult?: ApiResult<AddItemToOrderData>;
  },
  quantity: number,
): Promise<void> {
  if (!apiState.selectedVariantId) {
    throw new Error('Expected a product variant id to be selected');
  }

  apiState.expectedQuantity = quantity;
  apiState.addItemResult = await shopApi<AddItemToOrderData>(
    request,
    `mutation AddItemToOrder($variantId: ID!, $quantity: Int!) {
      addItemToOrder(productVariantId: $variantId, quantity: $quantity) {
        ... on Order {
          id
          totalQuantity
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }`,
    { variantId: apiState.selectedVariantId, quantity },
  );
}

Given(
  'I have an existing product variant id from the Shop API',
  async ({ request, apiState }) => {
    await selectFirstProductVariantId(request, apiState);
  },
);

Given(
  'I have added {int} items to the order through the Shop API',
  async ({ request, apiState }, quantity: number) => {
    await selectFirstProductVariantId(request, apiState);
    await addSelectedVariantToOrder(request, apiState, quantity);
  },
);

When('I request the active order from the Shop API', async ({ request, apiState }) => {
  apiState.activeOrderResult = await shopApi<ActiveOrderData>(
    request,
    `query ActiveOrder {
      activeOrder {
        id
        code
        totalQuantity
      }
    }`,
  );
});

When(
  'I add {int} of that product variant to the order',
  async ({ request, apiState }, quantity: number) => {
    await addSelectedVariantToOrder(request, apiState, quantity);
  },
);

Then('no active order should be returned', async ({ apiState }) => {
  const activeOrderResult = getActiveOrderResult(apiState.activeOrderResult);
  expect(activeOrderResult.body.data?.activeOrder).toBeNull();
});

Then(
  'the add item result should be an order with {int} items',
  async ({ apiState }, quantity: number) => {
    const addItemResult = getAddItemResult(apiState.addItemResult);
    const result = addItemResult.body.data?.addItemToOrder;

    expect(result).toBeDefined();

    if (!result || 'errorCode' in result) {
      throw new Error(
        result
          ? `addItemToOrder failed: ${result.errorCode} - ${result.message}`
          : 'addItemToOrder did not return a result',
      );
    }

    expect(result.totalQuantity).toBe(quantity);
  },
);

Then(
  'the active order should contain {int} items',
  async ({ apiState }, quantity: number) => {
    const activeOrderResult = getActiveOrderResult(apiState.activeOrderResult);
    expect(activeOrderResult.body.data?.activeOrder?.totalQuantity).toBe(quantity);
  },
);

Then('the add item result should be an error', async ({ apiState }) => {
  const addItemResult = getAddItemResult(apiState.addItemResult);
  const result = addItemResult.body.data?.addItemToOrder;

  expect(result).toBeDefined();
  expect(result && 'errorCode' in result).toBeTruthy();
});
