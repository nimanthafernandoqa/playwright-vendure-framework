Feature: Shop API authentication
  As an automation engineer
  I want to verify login behaviour through Vendure's Shop API
  So that authentication success and failure paths are covered

  Scenario: Invalid credentials are rejected
    When I log in through the Shop API with username "invalid.user@example.com" and password "wrong-password"
    Then the Shop API response should be successful
    And login should be rejected

  Scenario: Valid customer credentials can log in when configured
    Given Shop API login credentials are configured
    When I log in through the Shop API with the configured credentials
    Then the Shop API response should be successful
    And login should return the current user
