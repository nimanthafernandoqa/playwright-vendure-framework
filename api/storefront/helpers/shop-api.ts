import { type APIRequestContext } from '@playwright/test';
import { ENV } from '../../../utils/env';
import { expect, type ApiResult, type GraphQLResponse } from '../fixtures/api.fixture';

export async function shopApi<T>(
  request: APIRequestContext,
  query: string,
  variables?: Record<string, unknown>,
): Promise<ApiResult<T>> {
  const response = await request.post(ENV.shopApiUrl, {
    data: { query, variables },
  });

  const body = (await response.json()) as GraphQLResponse<T>;

  return {
    ok: response.ok(),
    status: response.status(),
    body,
  };
}

export function expectSuccessfulResult(result: ApiResult<unknown> | undefined): void {
  if (!result) {
    throw new Error('Expected an API result to be stored');
  }

  expect(result.status).toBe(200);
  expect(result.ok).toBeTruthy();
  expect(result.body.errors, JSON.stringify(result.body.errors)).toBeUndefined();
}
