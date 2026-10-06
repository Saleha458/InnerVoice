describe("InnerVoice — Expert Role", () => {
  it("tests expert login, navigation, permissions and logout", () => {
    /* =========================================
       LOGIN
    ========================================= */

    cy.loginAsExpert();

    /* =========================================
       EXPERT DASHBOARD
    ========================================= */

    cy.contains(
      "h1",
      "Expert Dashboard",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "Manage support requests and scheduled sessions."
    ).should("be.visible");

    /* =========================================
       SIDEBAR
    ========================================= */

    const sidebarItems = [
      "Dashboard",
      "Requests",
      "Sessions",
      "Recovery Kit",
      "Notifications",
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
       SUPPORT REQUESTS
    ========================================= */

    cy.intercept(
      "GET",
      "**/api/expert-requests/expert*"
    ).as("getExpertRequests");

    cy.visit("/expert/requests");

    cy.location("pathname")
      .should(
        "eq",
        "/expert/requests"
      );

    cy.wait(
      "@getExpertRequests",
      {
        timeout: 30000,
      }
    );

    cy.contains(
      "h1",
      "Support Requests",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    /*
     * Final InnerVoice scope must
     * not contain live Audio Call.
     */
    cy.contains(
      /audio call/i
    ).should("not.exist");

    /* =========================================
       EXPERT SESSIONS
    ========================================= */

    cy.intercept(
      "GET",
      "**/api/sessions/expert*"
    ).as("getExpertSessions");

    cy.visit("/expert/sessions");

    cy.location("pathname")
      .should(
        "eq",
        "/expert/sessions"
      );

    cy.wait(
      "@getExpertSessions",
      {
        timeout: 30000,
      }
    );

    cy.contains(
      "h1",
      "My Sessions",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    cy.contains(
      /audio call/i
    ).should("not.exist");

    /* =========================================
       LEGACY MESSAGES ROUTE REDIRECT
    ========================================= */

    cy.visit("/expert/messages");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/expert/sessions"
    );

    /* =========================================
       RECOVERY KIT
    ========================================= */

    cy.visit("/vault-recovery");

    cy.location("pathname")
      .should(
        "eq",
        "/vault-recovery"
      );

    cy.contains(
      "h1",
      "Recovery Kit",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       NOTIFICATIONS
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
       PROFESSIONAL PROFILE
    ========================================= */

    cy.visit("/expert/profile");

    cy.location("pathname")
      .should(
        "eq",
        "/expert/profile"
      );

    cy.contains(
      "h1",
      "Professional profile",
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
      "/expert/dashboard"
    );

    /* =========================================
       EXPERT CANNOT ACCESS USER AI AREA
    ========================================= */

    cy.visit("/chat");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/expert/dashboard"
    );

    /* =========================================
       EXPERT CANNOT ACCESS USER BOOKINGS
    ========================================= */

    cy.visit("/bookings");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/expert/dashboard"
    );

    /* =========================================
       EXPERT CANNOT ACCESS PARENT AREA
    ========================================= */

    cy.visit("/parent/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/expert/dashboard"
    );

    /* =========================================
       EXPERT CANNOT ACCESS ADMIN AREA
    ========================================= */

    cy.visit("/admin/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/expert/dashboard"
    );

    /* =========================================
       LOGOUT
    ========================================= */

    cy.logoutInnerVoice();
  });
});