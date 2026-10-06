describe("InnerVoice — Admin Role", () => {
  it("tests admin login, navigation, permissions and logout", () => {
    /* =========================================
       LOGIN
    ========================================= */

    cy.loginAsAdmin();

    /* =========================================
       ADMIN DASHBOARD
    ========================================= */

    cy.contains(
      "h1",
      "Admin dashboard",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "INNERVOICE / ADMINISTRATION"
    ).should("be.visible");

    cy.get(
      '[aria-label="Administration sections"]'
    ).should("be.visible");

    /* =========================================
       SIDEBAR
    ========================================= */

    const sidebarItems = [
      "Dashboard",
      "Expert Verification",
      "Users",
      "Reports",
    ];

    sidebarItems.forEach((item) => {
      cy.get(
        '[aria-label="Dashboard navigation"]'
      )
        .contains(item)
        .should("be.visible");
    });

    /* =========================================
       EXPERT VERIFICATION
    ========================================= */

    cy.intercept(
      "GET",
      "**/api/admin/experts/pending*"
    ).as("getPendingExperts");

    cy.visit("/admin/experts");

    cy.location("pathname")
      .should(
        "eq",
        "/admin/experts"
      );

    cy.wait(
      "@getPendingExperts",
      {
        timeout: 30000,
      }
    );

    cy.contains(
      "h1",
      "Expert Verification",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    /* =========================================
       USER MANAGEMENT
    ========================================= */

    cy.intercept(
      "GET",
      "**/api/admin/users*"
    ).as("getAdminUsers");

    cy.visit("/admin/users");

    cy.location("pathname")
      .should(
        "eq",
        "/admin/users"
      );

    cy.wait(
      "@getAdminUsers",
      {
        timeout: 30000,
      }
    );

    cy.contains(
      "h1",
      "User Management",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    /*
     * We intentionally do NOT click
     * suspend/delete actions in this smoke test.
     */
    cy.contains(
      "Permanent deletion requires"
    ).should("be.visible");

    /* =========================================
       PRIVATE REPORT REVIEW
    ========================================= */

    cy.visit("/admin/reports");

    cy.location("pathname")
      .should(
        "eq",
        "/admin/reports"
      );

    cy.contains(
      "h1",
      "Private report review",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    cy.contains(
      "Review reports encrypted for your Admin vault."
    ).should("be.visible");

    /* =========================================
       LEGACY ADMIN SESSIONS REDIRECT
    ========================================= */

    cy.visit("/admin/sessions");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    /* =========================================
       GENERIC DASHBOARD REDIRECT
    ========================================= */

    cy.visit("/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    /* =========================================
       ADMIN CANNOT ACCESS USER AREA
    ========================================= */

    cy.visit("/chat");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    cy.visit("/bookings");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    /* =========================================
       ADMIN CANNOT ACCESS EXPERT AREA
    ========================================= */

    cy.visit("/expert/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    /* =========================================
       ADMIN CANNOT ACCESS PARENT AREA
    ========================================= */

    cy.visit("/parent/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    /* =========================================
       ADMIN HAS NO USER/EXPERT PRIVATE CHAT
    ========================================= */

    cy.visit("/session-chat/fake-session-id");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/admin/dashboard"
    );

    /* =========================================
       LOGOUT
    ========================================= */

    cy.logoutInnerVoice();
  });
});