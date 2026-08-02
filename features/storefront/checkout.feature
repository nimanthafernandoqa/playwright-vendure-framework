Feature: Guest checkout
  As a shopper who doesn't want to create an account
  I want to buy a product using only my contact and shipping details
  So that I can complete a purchase without the friction of registering

  Background:
    Given I am on the storefront home page
    And I am viewing the product list
    When I open the product "Aloe Vera"
    And I add 1 of the product to the cart
    And I proceed to checkout

  Scenario: Guest completes checkout end-to-end without creating an account
    When I fill in my contact details as a guest:
      | email     | guest.checkout.test@example.com |
      | firstName | Guest                            |
      | lastName  | Tester                            |
    And I fill in my shipping address:
      | fullName      | Guest Tester    |
      | streetAddress | 123 Test Street |
      | city          | Colombo         |
      | postalCode    | 00100           |
      | phoneNumber   | +94711234567    |
      | country       | Sri Lanka       |
    And I choose "Standard Shipping" as my delivery method
    And I choose "Standard Payment" as my payment method
    And I place my order

    Then my order should be confirmed
    And I should still be checked out as a guest, not signed in
