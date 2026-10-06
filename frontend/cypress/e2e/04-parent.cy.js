describe("InnerVoice — Parent Role", () => {
  it("tests parent login, navigation, permissions and logout", () => {
    /* =========================================
       LOGIN
    ========================================= */

    cy.loginAsParent();

    /* =========================================
       PARENT DASHBOARD
    ========================================= */

    cy.contains(
      "h1",
      "Parent Support Center",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "PARENT EDUCATION HUB"
    ).should("be.visible");

    /* =========================================
       SIDEBAR
    ========================================= */

    const sidebarItems = [
      "Dashboard",
      "Parenting Foundations",
      "Guidelines",
      "Warning Signs",
      "Profile",
    ];

    sidebarItems.forEach((item) => {
      cy.get(
        '[aria-label="Dashboard navigation"]'
      )
        .contains(item)
        .should("be.visible");
    });

    /* =========================================
       PARENTING FOUNDATIONS
    ========================================= */

    cy.visit("/parent/foundations");

    cy.location("pathname")
      .should(
        "eq",
        "/parent/foundations"
      );

    cy.contains(
      "h1",
      "Parenting Foundations",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "Listen first. Respond calmly."
    ).should("be.visible");

    /* =========================================
       GUIDELINES
    ========================================= */

    cy.visit(
      "/parent/guidelines?age=0-3"
    );

    cy.location("pathname")
      .should(
        "eq",
        "/parent/guidelines"
      );

    cy.contains(
      "h1",
      "Guidance by Age",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    cy.contains(
      "AGE GROUP"
    ).should("be.visible");

    /* =========================================
       WARNING SIGNS
    ========================================= */

    cy.visit(
      "/parent/warnings?age=0-3"
    );

    cy.location("pathname")
      .should(
        "eq",
        "/parent/warnings"
      );

    cy.contains(
      "h1",
      "Warning Signs",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    cy.contains(
      "Important"
    ).should("be.visible");

    /* =========================================
       PARENT PROFILE
    ========================================= */

    cy.visit("/parent/profile");

    cy.location("pathname")
      .should(
        "eq",
        "/parent/profile"
      );

    cy.contains(
      "h1",
      "My profile",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    /* =========================================
       GENERIC DASHBOARD REDIRECT
    ========================================= */

    cy.visit("/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/parent/dashboard"
    );

    /* =========================================
       PARENT CANNOT ACCESS USER AREA
    ========================================= */

    cy.visit("/chat");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/parent/dashboard"
    );

    cy.visit("/bookings");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/parent/dashboard"
    );

    /* =========================================
       PARENT CANNOT ACCESS EXPERT AREA
    ========================================= */

    cy.visit("/expert/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/parent/dashboard"
    );

    /* =========================================
       PARENT CANNOT ACCESS ADMIN AREA
    ========================================= */

    cy.visit("/admin/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/parent/dashboard"
    );

    /* =========================================
       SHARED NOTIFICATIONS ROUTE
    ========================================= */

    cy.visit("/notifications");

    cy.location("pathname")
      .should(
        "eq",
        "/notifications"
      );

    cy.contains(
      "h1",
      "Notifications",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       LOGOUT
    ========================================= */

    cy.logoutInnerVoice();
  });
});