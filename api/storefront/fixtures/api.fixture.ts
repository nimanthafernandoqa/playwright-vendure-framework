import { expect } from '@playwright/test';
import { test as base } from 'playwright-bdd';

export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
};

export type ProductDetails = ProductSummary & {
  description: string;
};

export type GraphQLResponse<T> = {
  data?: T;
  errors?: unknown[];
};

export type ApiResult<T> = {
  ok: boolean;
  status: number;
  body: GraphQLResponse<T>;
};

export type ProductListData = {
  products: {
    totalItems: number;
    items: ProductSummary[];
  };
};

export type ProductData = {
  product: ProductDetails | null;
};

export type ProductVariantData = {
  product: {
    variants: { id: string }[];
  } | null;
};

export type ActiveOrderData = {
  activeOrder: {
    id: string;
    code?: string;
    totalQuantity: number;
  } | null;
};

export type AddItemToOrderData = {
  addItemToOrder:
    | {
        id: string;
        totalQuantity: number;
      }
    | {
        errorCode: string;
        message: string;
      };
};

export type LoginData = {
  login:
    | {
        id: string;
        identifier: string;
      }
    | {
        errorCode: string;
        message: string;
      };
};

type ApiState = {
  productList?: ApiResult<ProductListData>;
  productResult?: ApiResult<ProductData>;
  productVariantResult?: ApiResult<ProductVariantData>;
  activeOrderResult?: ApiResult<ActiveOrderData>;
  addItemResult?: ApiResult<AddItemToOrderData>;
  loginResult?: ApiResult<LoginData>;
  selectedSlug?: string;
  selectedVariantId?: string;
  expectedQuantity?: number;
};

export const test = base.extend<{ apiState: ApiState }>({
  apiState: async ({ request: _request }, use) => {
    await use({});
  },
});

export { expect };
