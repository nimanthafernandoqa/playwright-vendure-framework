Feature: Storefront shopping cart
  As a guest shopper on the Vendure storefront
  I want to add products to my cart
  So that I can purchase the items I'm interested in

  Background:
    Given I am on the storefront home page
    And I am viewing the product list

  Scenario: Guest adds a single product to the cart
    When I open the product "Aloe Vera"
    And I add 2 of the product to the cart
    Then the cart should contain 2 items

  Scenario: Guest adds multiple products with different quantities
    When I add the following products to the cart:
      | product       | quantity |
      | Aloe Vera     | 2        |
      | Balloon Chair | 3        |
    Then the cart should contain 5 items

  Scenario: Guest removes a product from the cart
    When I open the product "Aloe Vera"
    And I add 1 of the product to the cart
    And I remove the product from the cart
    Then the cart should be empty

  Scenario: Guest updates and removes multiple products from the cart
    When I add the following products to the cart:
      | product    | quantity |
      | Aloe Vera  | 3        |
      | Basketball | 2        |
    And I update the cart as follows:
      | product    | action | value |
      | Aloe Vera  | reduce | 1     |
      | Basketball | remove |       |

    Then the cart should contain:
      | product   | quantity |
      | Aloe Vera | 2        |

    And "Basketball" should not exist in the cart