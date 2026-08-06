Feature: Shop API cart and order
  As an automation engineer
  I want to verify guest cart behaviour through Vendure's Shop API
  So that order state is covered without opening a browser

  Scenario: Fresh guest session has no active order
    When I request the active order from the Shop API
    Then the Shop API response should be successful
    And no active order should be returned

  Scenario: Adding an item creates an active order
    Given I have an existing product variant id from the Shop API
    When I add 2 of that product variant to the order
    Then the Shop API response should be successful
    And the add item result should be an order with 2 items

  Scenario: Active order persists in the same API session
    Given I have added 2 items to the order through the Shop API
    When I request the active order from the Shop API
    Then the Shop API response should be successful
    And the active order should contain 2 items

  Scenario: Add item mutation rejects invalid quantity
    Given I have an existing product variant id from the Shop API
    When I add 0 of that product variant to the order
    Then the Shop API response should be successful
    And the add item result should be an error
