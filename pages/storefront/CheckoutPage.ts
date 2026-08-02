import { expect, Locator, Page } from '@playwright/test';

/**
 * Contact details entered on Checkout step 1. All three fields are
 * required by the storefront (marked with `*` in the UI).
 */
export interface GuestContactDetails {
  email: string;
  firstName: string;
  lastName: string;
}

/**
 * Shipping address entered on Checkout step 2. Only the starred fields
 * (fullName, streetAddress, city, postalCode, phoneNumber, country) are
 * required — company/apartment/stateProvince are optional on the real
 * form and left undefined by default here.
 */
export interface ShippingAddress {
  fullName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  phoneNumber: string;
  country: string;
  company?: string;
  apartment?: string;
  stateProvince?: string;
}

/**
 * Page Object for the guest checkout wizard ("/en/checkout") — a single
 * page with five sequential, accordion-style steps: Contact, Address,
 * Delivery, Payment, Review. Each step's form only becomes interactable
 * once the previous step has been submitted, which is why this class
 * exposes one method per step rather than one big "checkout()" call —
 * that keeps each Gherkin step's intent (and any step-specific failure)
 * clear, matching the granularity already used for the cart flow.
 *
 * Locator note: steps 1 and 2 both submit via a button whose accessible
 * name is literally "Continue" (steps 3/4 use distinct names — "Continue
 * to payment" / "Continue to review" — so no ambiguity there). Because
 * `getByRole` does substring matching by default, `exact: true` is used
 * everywhere here to avoid "Continue" incidentally matching "Continue to
 * payment"/"Continue to review" — the same class of bug fixed earlier in
 * the Dropdowns practice suite (see interview-practice/dropdowns).
 */
export class CheckoutPage {
  // Step 1 — Contact Information
  private readonly emailInput: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  // Shared by steps 1 and 2 — see class-level locator note above.
  private readonly continueButton: Locator;

  // Step 2 — Shipping Address
  private readonly fullNameInput: Locator;
  private readonly companyInput: Locator;
  private readonly streetAddressInput: Locator;
  private readonly apartmentInput: Locator;
  private readonly cityInput: Locator;
  private readonly stateProvinceInput: Locator;
  private readonly postalCodeInput: Locator;
  private readonly phoneNumberInput: Locator;
  // Opens a dialog containing its own search box + listbox of options
  // (role="option") — confirmed live rather than assumed, since this is
  // a custom combobox widget, not a native <select> (see ShoppingCartPage
  // header comment for this project's general stance on non-native
  // widgets needing their own handling).
  private readonly countryTrigger: Locator;
  private readonly countrySearchInput: Locator;

  // Step 3 — Delivery Method
  private readonly continueToPaymentButton: Locator;

  // Step 4 — Payment Method
  private readonly continueToReviewButton: Locator;

  // Step 5 — Review & Place Order
  private readonly placeOrderButton: Locator;

  // Order confirmation ("/en/order-confirmation/<code>")
  private readonly orderConfirmedHeading: Locator;

  constructor(private readonly page: Page) {
    this.emailInput = page.getByRole('textbox', { name: 'Email Address', exact: false });
    this.firstNameInput = page.getByRole('textbox', { name: 'First Name', exact: false });
    this.lastNameInput = page.getByRole('textbox', { name: 'Last Name', exact: false });
    this.continueButton = page.getByRole('button', { name: 'Continue', exact: true });

    this.fullNameInput = page.getByRole('textbox', { name: 'Full Name', exact: false });
    this.companyInput = page.getByRole('textbox', { name: 'Company', exact: true });
    this.streetAddressInput = page.getByRole('textbox', { name: 'Street Address', exact: false });
    this.apartmentInput = page.getByRole('textbox', { name: 'Apartment, suite, etc.', exact: true });
    this.cityInput = page.getByRole('textbox', { name: 'City', exact: false });
    this.stateProvinceInput = page.getByRole('textbox', { name: 'State/Province', exact: true });
    this.postalCodeInput = page.getByRole('textbox', { name: 'Postal Code', exact: false });
    this.phoneNumberInput = page.getByRole('textbox', { name: 'Phone Number', exact: false });
    this.countryTrigger = page.getByRole('combobox');
    this.countrySearchInput = page.getByPlaceholder('Search country...');

    this.continueToPaymentButton = page.getByRole('button', {
      name: 'Continue to payment',
      exact: true,
    });
    this.continueToReviewButton = page.getByRole('button', {
      name: 'Continue to review',
      exact: true,
    });
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order', exact: true });

    this.orderConfirmedHeading = page.getByRole('heading', { name: 'Order Confirmed!' });
  }

  /**
   * Asserts checkout has loaded on its first step, ready for contact
   * details. Call this right after navigating to checkout (e.g. from
   * ShoppingCartPage.proceedToCheckout()).
   */
  async verifyContactStepLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/checkout$/);
    await expect(this.emailInput).toBeVisible();
  }

  /**
   * Fills step 1 (Contact Information) and submits it. No account or
   * sign-in is involved — this is the guest path; the storefront also
   * offers a "Sign in" link on this step for existing customers, but it's
   * optional, not required, which is what makes true guest checkout
   * possible here.
   */
  async fillContactDetails(details: GuestContactDetails): Promise<void> {
    await this.emailInput.fill(details.email);
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.continueButton.click();
  }

  /**
   * Fills step 2 (Shipping Address) and submits it. Optional fields
   * (company, apartment, stateProvince) are only filled in if provided —
   * the real form accepts them blank.
   */
  async fillShippingAddress(address: ShippingAddress): Promise<void> {
    await this.fullNameInput.fill(address.fullName);

    if (address.company) {
      await this.companyInput.fill(address.company);
    }

    await this.streetAddressInput.fill(address.streetAddress);

    if (address.apartment) {
      await this.apartmentInput.fill(address.apartment);
    }

    await this.cityInput.fill(address.city);

    if (address.stateProvince) {
      await this.stateProvinceInput.fill(address.stateProvince);
    }

    await this.postalCodeInput.fill(address.postalCode);
    await this.selectCountry(address.country);
    await this.phoneNumberInput.fill(address.phoneNumber);

    await this.continueButton.click();
  }

  /**
   * Opens the custom country combobox, searches, and picks the exact
   * match. Kept private since it's only ever a sub-step of filling the
   * whole address — no scenario needs to change country in isolation.
   */
  private async selectCountry(country: string): Promise<void> {
    await this.countryTrigger.click();
    await this.countrySearchInput.fill(country);
    await this.page.getByRole('option', { name: country, exact: true }).click();
  }

  /**
   * Selects step 3's shipping method by its visible label (e.g.
   * "Standard Shipping") and submits.
   *
   * Locator note: the radio inputs themselves expose no accessible name
   * (confirmed live) — the label text lives in the surrounding <label>
   * instead. Clicking that label toggles its radio, same as clicking
   * anywhere on a standard HTML label/input pairing.
   */
  async selectDeliveryMethod(methodName: string): Promise<void> {
    await this.page.locator('label').filter({ hasText: methodName }).click();
    await this.continueToPaymentButton.click();
  }

  /**
   * Selects step 4's payment method by its visible label (e.g.
   * "Standard Payment" — this storefront's dev/demo dummy payment
   * handler, the only option available locally) and submits.
   */
  async selectPaymentMethod(methodName: string): Promise<void> {
    await this.page.locator('label').filter({ hasText: methodName }).click();
    await this.continueToReviewButton.click();
  }

  /**
   * Places the order from step 5. This is the one genuinely irreversible
   * action in the whole flow, so it's kept as its own explicit method/step
   * rather than folded into the review step's setup.
   */
  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
  }

  /**
   * Asserts the order completed successfully: the storefront navigated to
   * "/en/order-confirmation/<code>" and rendered the confirmation heading.
   */
  async verifyOrderConfirmed(): Promise<void> {
    await expect(this.page).toHaveURL(/\/order-confirmation\//);
    await expect(this.orderConfirmedHeading).toBeVisible();
  }

  /**
   * Extracts the order number from the confirmation URL
   * ("/en/order-confirmation/<code>") rather than scraping it out of the
   * page's "Your order number is ..." text — the URL is a stabler source
   * for this since it doesn't depend on exact confirmation-copy wording.
   */
  getOrderNumber(): string {
    const match = this.page.url().match(/\/order-confirmation\/([A-Za-z0-9]+)/);

    if (!match) {
      throw new Error(
        `Could not extract an order number from the current URL: ${this.page.url()}`,
      );
    }

    return match[1];
  }
}
