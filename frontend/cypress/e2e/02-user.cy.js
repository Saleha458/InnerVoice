describe("InnerVoice — User Role", () => {
  it("tests user login, navigation, permissions and logout", () => {
    /* =========================================
       LOGIN
    ========================================= */

    cy.loginAsUser();

    /* =========================================
       USER DASHBOARD
    ========================================= */

    cy.contains(
      "YOUR PRIVATE SPACE"
    ).should("be.visible");

    cy.contains(
      "Welcome back"
    ).should("be.visible");

    cy.contains(
      "Quick Exit"
    ).should("be.visible");

    /* =========================================
       SIDEBAR
    ========================================= */

    const sidebarItems = [
      "Dashboard",
      "AI Support",
      "Find Expert",
      "My Sessions",
      "Notifications",
      "Mood",
      "Journal",
      "Reports",
      "Starred Messages",
      "Recovery Kit",
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
       AI SUPPORT
    ========================================= */

    cy.visit("/chat");

    cy.location("pathname")
      .should("eq", "/chat");

    cy.contains(
      "h1",
      "AI Support",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       FIND EXPERT
    ========================================= */

    cy.visit("/experts");

    cy.location("pathname")
      .should("eq", "/experts");

    cy.contains(
      "h1",
      "Find an Expert",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       MY SESSIONS
    ========================================= */

    cy.intercept(
      "GET",
      "**/api/sessions/user*"
    ).as("getUserSessions");

    cy.intercept(
      "GET",
      "**/api/expert-requests/user*"
    ).as("getUserBookingRequests");

    cy.visit("/bookings");

    cy.location("pathname", {
      timeout: 20000,
    }).should("eq", "/bookings");

    cy.wait(
      "@getUserSessions",
      {
        timeout: 30000,
      }
    );

    cy.wait(
      "@getUserBookingRequests",
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

    /*
     * Live audio calling was removed
     * from final InnerVoice scope.
     */
    cy.contains(
      /audio call/i
    ).should("not.exist");

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
       MOOD
    ========================================= */

    cy.visit("/mood");

    cy.location("pathname")
      .should("eq", "/mood");

    cy.contains(
      "h1",
      "Mood & wellbeing",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       JOURNAL
    ========================================= */

    cy.visit("/journal");

    cy.location("pathname")
      .should("eq", "/journal");

    cy.contains(
      "h1",
      "Journal",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       REPORTS
    ========================================= */

    cy.visit("/reports");

    cy.location("pathname")
      .should("eq", "/reports");

    cy.contains(
      "h1",
      "Your reports",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =========================================
       STARRED MESSAGES
    ========================================= */

    cy.visit("/starred");

    cy.location("pathname")
      .should("eq", "/starred");

    cy.contains(
      "h1",
      "Starred Messages",
      {
        timeout: 20000,
      }
    ).should("be.visible");

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
       PROFILE
    ========================================= */

    cy.visit("/profile");

    cy.location("pathname")
      .should("eq", "/profile");

    cy.contains(
      "h1",
      "My profile",
      {
        timeout: 20000,
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
      "/user/dashboard"
    );

    /* =========================================
       USER CANNOT ACCESS EXPERT AREA
    ========================================= */

    cy.visit(
      "/expert/dashboard"
    );

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/user/dashboard"
    );

    /* =========================================
       USER CANNOT ACCESS PARENT AREA
    ========================================= */

    cy.visit(
      "/parent/dashboard"
    );

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/user/dashboard"
    );

    /* =========================================
       USER CANNOT ACCESS ADMIN AREA
    ========================================= */

    cy.visit(
      "/admin/dashboard"
    );

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/user/dashboard"
    );

    /* =========================================
       LOGOUT
    ========================================= */

    cy.logoutInnerVoice();
  });
});