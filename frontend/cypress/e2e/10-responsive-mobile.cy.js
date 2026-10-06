describe("InnerVoice — Responsive & Mobile Smoke Testing", () => {
  /*
   * Small tolerance avoids false failures caused by
   * browser rounding of 1–3 pixels.
   */
  const expectNoHorizontalOverflow = () => {
    cy.document().then((doc) => {
      const root = doc.documentElement;

      expect(
        root.scrollWidth,
        "page horizontal overflow"
      ).to.be.lte(
        root.clientWidth + 5
      );
    });
  };

  /* =====================================================
     TEST 1 — MOBILE PUBLIC PAGES
  ===================================================== */

  it("renders public pages correctly on mobile", () => {
    cy.viewport(
      390,
      844
    );

    /* -----------------------------------------------------
       LANDING PAGE
    ----------------------------------------------------- */

    cy.visit("/");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/"
    );

    cy.contains(
      "InnerVoice",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    cy.contains(
      /Every feeling/i
    ).should(
      "be.visible"
    );

    cy.contains(
      /Sign in/i
    ).should(
      "be.visible"
    );

    cy.contains(
      /Create your space/i
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       LOGIN PAGE
    ----------------------------------------------------- */

    cy.visit("/login");

    cy.contains(
      "h1",
      "Welcome back.",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    cy.get(
      "#login-anonymous-id"
    ).should(
      "be.visible"
    );

    cy.get(
      "#login-password"
    ).should(
      "be.visible"
    );

    cy.contains(
      "button",
      "Sign in"
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       REGISTRATION PAGE
    ----------------------------------------------------- */

    cy.visit("/register");

    cy.get(
      "body"
    ).should(
      "be.visible"
    );

    cy.contains(
      /Create/i,
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();
  });

  /* =====================================================
     TEST 2 — AUTHENTICATED USER ON MOBILE
  ===================================================== */

  it("renders major authenticated user pages correctly on mobile", () => {
    /*
     * loginAsUser currently verifies the desktop
     * dashboard sidebar, so login at desktop size first.
     */
    cy.viewport(
      1440,
      900
    );

    cy.loginAsUser();

    /*
     * Switch to mobile AFTER login.
     */
    cy.viewport(
      390,
      844
    );

    /* -----------------------------------------------------
       USER DASHBOARD
    ----------------------------------------------------- */

    cy.visit(
      "/user/dashboard"
    );

    cy.location(
      "pathname",
      {
        timeout: 15000,
      }
    ).should(
      "eq",
      "/user/dashboard"
    );

    cy.contains(
      /Welcome back/i,
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       AI SUPPORT
    ----------------------------------------------------- */

    cy.visit("/chat");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/chat"
    );

    cy.contains(
      "h1",
      "AI Support",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       FIND EXPERT
    ----------------------------------------------------- */

    cy.visit("/experts");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/experts"
    );

    cy.contains(
      "h1",
      "Find an Expert",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       MY SESSIONS
    ----------------------------------------------------- */

    cy.visit("/bookings");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/bookings"
    );

    cy.contains(
      "h1",
      "My Sessions",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    /*
     * Audio calling must remain removed from
     * the final InnerVoice scope.
     */
    cy.contains(
      /audio call/i
    ).should(
      "not.exist"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       NOTIFICATIONS
    ----------------------------------------------------- */

    cy.visit(
      "/notifications"
    );

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/notifications"
    );

    cy.contains(
      "h1",
      "Notifications",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       MOOD
    ----------------------------------------------------- */

    cy.visit("/mood");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/mood"
    );

    cy.contains(
      "h1",
      "Mood & wellbeing",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       JOURNAL
    ----------------------------------------------------- */

    cy.visit("/journal");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/journal"
    );

    cy.contains(
      "h1",
      "Journal",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       REPORTS
    ----------------------------------------------------- */

    cy.visit("/reports");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/reports"
    );

    cy.contains(
      "h1",
      "Your reports",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       PROFILE
    ----------------------------------------------------- */

    cy.visit("/profile");

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/profile"
    );

    cy.contains(
      "h1",
      /Your Profile|My profile/i,
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();
  });

  /* =====================================================
     TEST 3 — TABLET
  ===================================================== */

  it("renders important pages correctly on tablet", () => {
    cy.viewport(
      768,
      1024
    );

    /* -----------------------------------------------------
       LANDING
    ----------------------------------------------------- */

    cy.visit("/");

    cy.contains(
      /Every feeling/i,
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       LOGIN
    ----------------------------------------------------- */

    cy.visit("/login");

    cy.contains(
      "h1",
      "Welcome back.",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /*
     * loginAsUser expects the normal dashboard
     * layout, therefore restore desktop temporarily.
     */
    cy.viewport(
      1440,
      900
    );

    cy.loginAsUser();

    cy.viewport(
      768,
      1024
    );

    /* -----------------------------------------------------
       DASHBOARD
    ----------------------------------------------------- */

    cy.visit(
      "/user/dashboard"
    );

    cy.contains(
      /Welcome back/i,
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       BOOKINGS
    ----------------------------------------------------- */

    cy.visit("/bookings");

    cy.contains(
      "h1",
      "My Sessions",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    cy.contains(
      /audio call/i
    ).should(
      "not.exist"
    );

    expectNoHorizontalOverflow();

    /* -----------------------------------------------------
       AI SUPPORT
    ----------------------------------------------------- */

    cy.visit("/chat");

    cy.contains(
      "h1",
      "AI Support",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    expectNoHorizontalOverflow();
  });
});