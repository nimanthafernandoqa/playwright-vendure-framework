Feature: Shop API products
  As an automation engineer
  I want to verify product data through Vendure's Shop API
  So that catalogue behaviour is covered without opening a browser

  Scenario: Product list returns products with the expected fields
    When I request the product list from the Shop API
    Then the Shop API response should be successful
    And the product list should contain products
    And every returned product should include id, name, and slug

  Scenario: Product can be fetched by slug
    Given I have an existing product slug from the Shop API
    When I request the product by that slug
    Then the Shop API response should be successful
    And the returned product should match that slug
    And the returned product should include id, name, slug, and description

  Scenario: Unknown product slug returns no product
    When I request a product using the unknown slug "not-a-real-product"
    Then the Shop API response should be successful
    And no product should be returned
