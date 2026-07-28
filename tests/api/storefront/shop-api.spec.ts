import { test, expect, APIRequestContext } from '@playwright/test';
import { ENV } from '../../../utils/env';

/**
 * Tests against Vendure's real Shop GraphQL API (not a demo/placeholder API).
 * Endpoint defaults to ${ADMIN_BASE_URL}/shop-api — see utils/env.ts and
 * .env.example for how to point this at a different Vendure instance.
 *
 * Each Playwright `request` context keeps cookies for its own test, so the
 * guest session (and therefore the active order) is consistent across the
 * multiple calls within a single test, but isolated between tests.
 */
const shopApiUrl = `${ENV.adminBaseUrl}/shop-api`;

async function shopApi<T = unknown>(
  request: APIRequestContext,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await request.post(shopApiUrl, {
    data: { query, variables },
  });

  expect(response.ok(), `Shop API request failed: ${response.status()}`).toBeTruthy();

  const body = await response.json();

  expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();

  return body.data as T;
}

test.describe('Shop API — products', () => {
  test('returns a paginated list of products', async ({ request }) => {
    const data = await shopApi<{
      products: {
        totalItems: number;
        items: { id: string; name: string; slug: string }[];
      };
    }>(
      request,
      `query Products($take: Int!) {
        products(options: { take: $take }) {
          totalItems
          items { id name slug }
        }
      }`,
      { take: 5 },
    );

    expect(data.products.totalItems).toBeGreaterThan(0);
    expect(data.products.items.length).toBeGreaterThan(0);
    expect(data.products.items.length).toBeLessThanOrEqual(5);

    for (const product of data.products.items) {
      expect(product.id).toBeTruthy();
      expect(product.name).toBeTruthy();
      expect(product.slug).toBeTruthy();
    }
  });

  test('returns a single product by slug', async ({ request }) => {
    const data = await shopApi<{ product: { name: string; slug: string } | null }>(
      request,
      `query ProductBySlug($slug: String!) {
        product(slug: $slug) { name slug }
      }`,
      { slug: 'aloe-vera' },
    );

    expect(data.product).not.toBeNull();
    expect(data.product?.name).toBe('Aloe Vera');
  });

  test('returns null for an unknown product slug', async ({ request }) => {
    const data = await shopApi<{ product: unknown }>(
      request,
      `query ProductBySlug($slug: String!) {
        product(slug: $slug) { name slug }
      }`,
      { slug: 'this-product-does-not-exist' },
    );

    expect(data.product).toBeNull();
  });

  test('search returns matching products for a search term', async ({ request }) => {
    const data = await shopApi<{
      search: { totalItems: number; items: { productName: string }[] };
    }>(
      request,
      `query Search($term: String!) {
        search(input: { term: $term, take: 10 }) {
          totalItems
          items { productName }
        }
      }`,
      { term: 'Aloe' },
    );

    expect(data.search.totalItems).toBeGreaterThan(0);
    expect(
      data.search.items.some((item) => item.productName.toLowerCase().includes('aloe')),
    ).toBeTruthy();
  });
});

test.describe('Shop API — order', () => {
  test('a fresh guest session has no active order', async ({ request }) => {
    const data = await shopApi<{ activeOrder: unknown }>(
      request,
      `query { activeOrder { id totalQuantity } }`,
    );

    expect(data.activeOrder).toBeNull();
  });

  test('adding a product variant creates an active order with the right quantity', async ({
    request,
  }) => {
    // Discover a real variant id from the API instead of hardcoding one —
    // keeps this test valid even if product data changes.
    const productData = await shopApi<{
      product: { variants: { id: string }[] } | null;
    }>(
      request,
      `query {
        product(slug: "aloe-vera") {
          variants { id }
        }
      }`,
    );

    const variantId = productData.product?.variants[0]?.id;
    expect(variantId, 'Expected "aloe-vera" to have at least one variant').toBeTruthy();

    const addItemResult = await shopApi<{
      addItemToOrder:
        { id: string; totalQuantity: number } | { errorCode: string; message: string };
    }>(
      request,
      `mutation AddItem($variantId: ID!, $quantity: Int!) {
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
      { variantId, quantity: 2 },
    );

    if ('errorCode' in addItemResult.addItemToOrder) {
      throw new Error(
        `addItemToOrder failed: ${addItemResult.addItemToOrder.errorCode} — ${addItemResult.addItemToOrder.message}`,
      );
    }

    expect(addItemResult.addItemToOrder.totalQuantity).toBe(2);

    // Confirm the order persists for this session on a fresh request.
    const activeOrderData = await shopApi<{
      activeOrder: { totalQuantity: number } | null;
    }>(request, `query { activeOrder { totalQuantity } }`);

    expect(activeOrderData.activeOrder?.totalQuantity).toBe(2);
  });
});

test.describe('Shop API — customer authentication', () => {
  // Skips cleanly (instead of failing) when no test credentials are
  // configured, e.g. in CI runs that haven't set up a seeded test customer.
  test.skip(
    !ENV.apiUsername || !ENV.apiPassword,
    'API_USERNAME / API_PASSWORD not set — see .env.example',
  );

  test('logs in with valid credentials', async ({ request }) => {
    const data = await shopApi<{
      login: { identifier: string } | { errorCode: string; message: string };
    }>(
      request,
      `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser {
            identifier
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }`,
      { username: ENV.apiUsername, password: ENV.apiPassword },
    );

    if ('errorCode' in data.login) {
      throw new Error(`Login failed: ${data.login.errorCode} — ${data.login.message}`);
    }

    expect(data.login.identifier).toBe(ENV.apiUsername);
  });

  test('rejects an invalid password', async ({ request }) => {
    const data = await shopApi<{
      login: { identifier: string } | { errorCode: string; message: string };
    }>(
      request,
      `mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          ... on CurrentUser {
            identifier
          }
          ... on ErrorResult {
            errorCode
            message
          }
        }
      }`,
      { username: ENV.apiUsername, password: 'definitely-the-wrong-password' },
    );

    expect('errorCode' in data.login).toBeTruthy();
  });
});
