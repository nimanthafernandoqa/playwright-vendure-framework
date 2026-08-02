// steps/storefront/checkout.steps.ts
//
// Step definitions for features/storefront/checkout.feature — the guest
// checkout end-to-end scenario. Kept in its own file (rather than folded
// into cart.steps.ts) because it drives a different Page Object
// (CheckoutPage) covering a distinct part of the storefront, even though
// it reuses several existing cart steps in its Background (see
// cart.steps.ts for "I open the product" / "I add {int} of the product
// to the cart").
import { createBdd, DataTable } from 'playwright-bdd';
import { test, expect } from '../../fixtures/storefront/fixture';

const { When, Then } = createBdd(test);

When(
  'I proceed to checkout',
  async ({ headerComponent, shoppingCartPage, checkoutPage }) => {
    await headerComponent.openCart();
    await shoppingCartPage.verifyCartLoaded();
    await shoppingCartPage.proceedToCheckout();
    await checkoutPage.verifyContactStepLoaded();
  },
);

// table.rowsHash() turns a header-less two-column table (field | value)
// into a plain object — a natural fit for "fill in this set of named
// fields", as opposed to table.hashes() (used elsewhere in this suite)
// which expects a header row and produces one object per row.
When(
  'I fill in my contact details as a guest:',
  async ({ checkoutPage }, table: DataTable) => {
    const { email, firstName, lastName } = table.rowsHash();
    await checkoutPage.fillContactDetails({ email, firstName, lastName });
  },
);

When(
  'I fill in my shipping address:',
  async ({ checkoutPage }, table: DataTable) => {
    const address = table.rowsHash();

    await checkoutPage.fillShippingAddress({
      fullName: address.fullName,
      streetAddress: address.streetAddress,
      city: address.city,
      postalCode: address.postalCode,
      phoneNumber: address.phoneNumber,
      country: address.country,
      company: address.company,
      apartment: address.apartment,
      stateProvince: address.stateProvince,
    });
  },
);

When(
  'I choose {string} as my delivery method',
  async ({ checkoutPage }, methodName: string) => {
    await checkoutPage.selectDeliveryMethod(methodName);
  },
);

When(
  'I choose {string} as my payment method',
  async ({ checkoutPage }, methodName: string) => {
    await checkoutPage.selectPaymentMethod(methodName);
  },
);

When('I place my order', async ({ checkoutPage }) => {
  await checkoutPage.placeOrder();
});

Then('my order should be confirmed', async ({ checkoutPage }) => {
  await checkoutPage.verifyOrderConfirmed();
});

// The concrete, verifiable proof that this really was a *guest* checkout:
// the header still offers "Sign in" rather than showing a logged-in
// account — i.e. no account was created or required anywhere in the flow.
Then(
  'I should still be checked out as a guest, not signed in',
  async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  },
);
