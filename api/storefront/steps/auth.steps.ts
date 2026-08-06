import { type APIRequestContext } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { ENV } from '../../../utils/env';
import { type ApiResult, expect, type LoginData, test } from '../fixtures/api.fixture';
import { expectSuccessfulResult, shopApi } from '../helpers/shop-api';

const { Given, When, Then } = createBdd(test);

function getLoginResult(result: ApiResult<LoginData> | undefined): ApiResult<LoginData> {
  if (!result) {
    throw new Error('Expected a login API result to be stored');
  }

  expectSuccessfulResult(result);
  return result;
}

async function login(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<ApiResult<LoginData>> {
  return shopApi<LoginData>(
    request,
    `mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        ... on CurrentUser {
          id
          identifier
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }`,
    { username, password },
  );
}

Given('Shop API login credentials are configured', async () => {
  test.skip(
    !ENV.apiUsername || !ENV.apiPassword,
    'API_USERNAME and API_PASSWORD are not configured',
  );
});

When(
  'I log in through the Shop API with username {string} and password {string}',
  async ({ request, apiState }, username: string, password: string) => {
    apiState.loginResult = await login(request, username, password);
  },
);

When(
  'I log in through the Shop API with the configured credentials',
  async ({ request, apiState }) => {
    if (!ENV.apiUsername || !ENV.apiPassword) {
      throw new Error('Expected API_USERNAME and API_PASSWORD to be configured');
    }

    apiState.loginResult = await login(request, ENV.apiUsername, ENV.apiPassword);
  },
);

Then('login should be rejected', async ({ apiState }) => {
  const loginResult = getLoginResult(apiState.loginResult);
  const result = loginResult.body.data?.login;

  expect(result).toBeDefined();
  expect(result && 'errorCode' in result).toBeTruthy();
});

Then('login should return the current user', async ({ apiState }) => {
  const loginResult = getLoginResult(apiState.loginResult);
  const result = loginResult.body.data?.login;

  expect(result).toBeDefined();

  if (!result || 'errorCode' in result) {
    throw new Error(
      result
        ? `Login failed: ${result.errorCode} - ${result.message}`
        : 'Login did not return a result',
    );
  }

  expect(result.id).toBeTruthy();
  expect(result.identifier).toBe(ENV.apiUsername);
});
