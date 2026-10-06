describe("InnerVoice — Booking, Session & Chat Access", () => {
  it("tests complete user-to-expert booking workflow", () => {
    const bookingMessage =
      `Cypress booking E2E test ${Date.now()}`;

    /* =====================================================
       HELPER — FIND FIRST AVAILABLE SLOT

       If current selected date has no slot,
       automatically checks the next date.
    ===================================================== */

    const chooseFirstAvailableSlot = (attempt = 0) => {
      if (attempt >= 8) {
        throw new Error(
          "No available booking slot was found within 8 checked dates."
        );
      }

      cy.get("body", {
        timeout: 30000,
      }).then(($body) => {
        const nextDayButton =
          [...$body.find("button")].find(
            (button) =>
              button.textContent.trim() ===
              "Check next day"
          );

        if (nextDayButton) {
          cy.wrap(nextDayButton)
            .should("be.enabled")
            .click();

          cy.wait("@availability", {
            timeout: 30000,
          }).then((interception) => {
            expect(
              interception.response,
              "availability response"
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.eq(200);
          });

          chooseFirstAvailableSlot(
            attempt + 1
          );

          return;
        }

        cy.contains(
          ".form-label",
          /^Free times on/
        )
          .closest(".form-group")
          .find(".button-row button")
          .first()
          .should("be.visible")
          .and("be.enabled")
          .click();

        cy.contains(
          "Selected session:",
          {
            timeout: 15000,
          }
        ).should("be.visible");

        cy.contains(
          "Duration:"
        ).should("be.visible");
      });
    };

    /* =====================================================
       STEP 1 — LOGIN AS THE TEST EXPERT

       Get exact expert document ID first.
    ===================================================== */

    cy.intercept(
      "GET",
      "**/api/experts/me*"
    ).as("getExpertProfile");

    cy.loginAsExpert();

    cy.wait(
      "@getExpertProfile",
      {
        timeout: 30000,
      }
    ).then((interception) => {
      expect(
        interception.response,
        "expert profile response"
      ).to.exist;

      expect(
        interception.response.statusCode
      ).to.eq(200);

      const expertId =
        interception.response.body
          ?.expert?.id;

      expect(
        expertId,
        "verified expert ID"
      )
        .to.be.a("string")
        .and.not.be.empty;

      /*
       * IMPORTANT:
       * Store asynchronously obtained ID
       * as a Cypress alias.
       */
      cy.wrap(
        expertId,
        {
          log: false,
        }
      ).as("targetExpertId");
    });

    /* =====================================================
       LOG EXPERT OUT
    ===================================================== */

    cy.logoutInnerVoice();

    /* =====================================================
       STEP 2 — LOGIN AS USER
    ===================================================== */

    cy.loginAsUser();

    /* =====================================================
       FIND EXPERT PAGE
    ===================================================== */

    cy.intercept(
      "GET",
      "**/api/experts/verified*"
    ).as("verifiedExperts");

    cy.visit("/experts");

    cy.wait(
      "@verifiedExperts",
      {
        timeout: 30000,
      }
    ).then((interception) => {
      expect(
        interception.response,
        "verified experts response"
      ).to.exist;

      expect(
        interception.response.statusCode
      ).to.eq(200);

      expect(
        interception.response.body
          ?.experts
      ).to.be.an("array");
    });

    cy.contains(
      "h1",
      "Find an Expert",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.get("#genderFilter")
      .should("be.visible");

    /* =====================================================
       GET TARGET EXPERT ID AT THE CORRECT TIME

       Everything requiring expertId is placed
       inside this callback.
    ===================================================== */

    cy.get(
      "@targetExpertId"
    ).then((expertId) => {
      /* ===================================================
         VERIFY THE EXACT EXPERT IS AVAILABLE
      =================================================== */

      cy.get(
        `a[href="/bookings/new?expertId=${expertId}"]`,
        {
          timeout: 30000,
        }
      )
        .should("be.visible")
        .and(
          "contain.text",
          "Book session"
        );

      /* ===================================================
         PREPARE AVAILABILITY INTERCEPT
      =================================================== */

      cy.intercept(
        "GET",
        `**/api/sessions/availability/${expertId}*`
      ).as("availability");

      /* ===================================================
         STEP 3 — OPEN BOOKING PAGE
      =================================================== */

      cy.visit(
        `/bookings/new?expertId=${encodeURIComponent(
          expertId
        )}`
      );

      cy.location(
        "pathname",
        {
          timeout: 20000,
        }
      ).should(
        "eq",
        "/bookings/new"
      );

      cy.contains(
        "h1",
        "Book a private session",
        {
          timeout: 30000,
        }
      ).should("be.visible");

      cy.contains(
        "✓ Verified",
        {
          timeout: 20000,
        }
      ).should("be.visible");

      /* ===================================================
         WAIT FOR INITIAL AVAILABILITY
      =================================================== */

      cy.wait(
        "@availability",
        {
          timeout: 30000,
        }
      ).then((interception) => {
        expect(
          interception.response,
          "initial availability response"
        ).to.exist;

        expect(
          interception.response.statusCode
        ).to.eq(200);

        expect(
          interception.response.body
            ?.slots
        ).to.be.an("array");
      });

      /* ===================================================
         BOOKING FORM
      =================================================== */

      cy.get(
        'input[type="date"]'
      )
        .should("be.visible")
        .should(($input) => {
          expect(
            $input
          ).to.have.attr(
            "required"
          );
        });

      cy.contains(
        ".form-label",
        "Session length"
      ).should("be.visible");

      cy.get(
        "select.form-input"
      )
        .should("be.visible");

      /*
       * Keep application's default 30-minute
       * duration to avoid unnecessary additional
       * availability requests.
       */

      /* ===================================================
         CHOOSE FIRST AVAILABLE SLOT

         Automatically moves to next day if required.
      =================================================== */

      chooseFirstAvailableSlot();

      /* ===================================================
         OPTIONAL MESSAGE
      =================================================== */

      cy.get(
        'textarea[placeholder="Share only what you are comfortable sharing before the session."]'
      )
        .should("be.visible")
        .clear()
        .type(
          bookingMessage
        );

      /* ===================================================
         INTERCEPT CREATE REQUEST
      =================================================== */

      cy.intercept(
        "POST",
        "**/api/expert-requests"
      ).as("createBooking");

      /* ===================================================
         STUB SUCCESS ALERT
      =================================================== */

      cy.window().then((win) => {
        cy.stub(
          win,
          "alert"
        ).as("bookingAlert");
      });

      /* ===================================================
         SUBMIT REQUEST
      =================================================== */

      cy.contains(
        "button",
        "Request session"
      )
        .should("be.visible")
        .and("be.enabled")
        .click();

      /* ===================================================
         VERIFY BACKEND CREATED REQUEST
      =================================================== */

      cy.wait(
        "@createBooking",
        {
          timeout: 30000,
        }
      ).then((interception) => {
        expect(
          interception.response,
          "booking response"
        ).to.exist;

        expect(
          interception.response.statusCode
        ).to.eq(201);

        expect(
          interception.response.body
            ?.success
        ).to.eq(true);

        const requestId =
          interception.response.body
            ?.requestId;

        expect(
          requestId,
          "created request ID"
        )
          .to.be.a("string")
          .and.not.be.empty;

        cy.wrap(
          requestId,
          {
            log: false,
          }
        ).as("createdRequestId");
      });

      /* ===================================================
         USER IS REDIRECTED TO MY SESSIONS
      =================================================== */

      cy.location(
        "pathname",
        {
          timeout: 30000,
        }
      ).should(
        "eq",
        "/bookings"
      );

      cy.contains(
        "h1",
        "My Sessions",
        {
          timeout: 30000,
        }
      ).should("be.visible");

      /* ===================================================
         EXACT CREATED REQUEST MUST APPEAR
      =================================================== */

      cy.contains(
        "article.feature-card",
        bookingMessage,
        {
          timeout: 30000,
        }
      )
        .should("be.visible")
        .within(() => {
          cy.contains(
            "Request pending"
          ).should(
            "be.visible"
          );

          cy.contains(
            "Your expert has been notified."
          ).should(
            "be.visible"
          );

          /*
           * Live audio calling must
           * remain removed.
           */
          cy.contains(
            /audio call/i
          ).should(
            "not.exist"
          );
        });
    });

    /* =====================================================
       STEP 4 — USER LOGOUT
    ===================================================== */

    cy.logoutInnerVoice();

    /* =====================================================
       STEP 5 — LOGIN AS EXPERT AGAIN
    ===================================================== */

    cy.loginAsExpert();

    /* =====================================================
       EXPERT REQUESTS PAGE
    ===================================================== */

    cy.intercept(
      "GET",
      "**/api/expert-requests/expert*"
    ).as("expertRequests");

    cy.visit(
      "/expert/requests"
    );

    cy.wait(
      "@expertRequests",
      {
        timeout: 30000,
      }
    ).then((interception) => {
      expect(
        interception.response,
        "expert requests response"
      ).to.exist;

      expect(
        interception.response.statusCode
      ).to.eq(200);

      expect(
        interception.response.body
          ?.requests
      ).to.be.an("array");
    });

    cy.contains(
      "h1",
      "Support Requests",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    /* =====================================================
       EXACT USER REQUEST MUST BE PRESENT
    ===================================================== */

    cy.contains(
      "article.feature-card",
      bookingMessage,
      {
        timeout: 30000,
      }
    )
      .should("be.visible")
      .within(() => {
        cy.contains(
          "User message"
        ).should(
          "be.visible"
        );

        cy.contains(
          bookingMessage
        ).should(
          "be.visible"
        );

        cy.contains(
          /slot is temporarily reserved/i
        ).should(
          "be.visible"
        );

        cy.contains(
          "button",
          "✓ Accept & confirm"
        )
          .should("be.visible")
          .and("be.enabled");
      });

    /* =====================================================
       CONFIRM ACCEPT DIALOG
    ===================================================== */

    cy.window().then((win) => {
      cy.stub(
        win,
        "confirm"
      ).returns(true);
    });

    /* =====================================================
       INTERCEPT ANY REQUEST UPDATE

       We do NOT build this URL using an async
       JavaScript variable anymore.
    ===================================================== */

    cy.intercept(
      "PATCH",
      "**/api/expert-requests/*"
    ).as("acceptBooking");

    /* =====================================================
       ACCEPT EXACT CYPRESS REQUEST
    ===================================================== */

    cy.contains(
      "article.feature-card",
      bookingMessage,
      {
        timeout: 30000,
      }
    ).within(() => {
      cy.contains(
        "button",
        "✓ Accept & confirm"
      )
        .should("be.enabled")
        .click();
    });

    /* =====================================================
       VERIFY ACCEPT RESPONSE + SAVE SESSION ID
    ===================================================== */

    cy.wait(
      "@acceptBooking",
      {
        timeout: 30000,
      }
    ).then((interception) => {
      expect(
        interception.response,
        "accept request response"
      ).to.exist;

      expect(
        interception.response.statusCode
      ).to.eq(200);

      expect(
        interception.response.body
          ?.success
      ).to.eq(true);

      expect(
        interception.response.body
          ?.status
      ).to.eq("accepted");

      const sessionId =
        interception.response.body
          ?.sessionId;

      expect(
        sessionId,
        "created session ID"
      )
        .to.be.a("string")
        .and.not.be.empty;

      cy.wrap(
        sessionId,
        {
          log: false,
        }
      ).as("createdSessionId");
    });

    /* =====================================================
       SUCCESS MESSAGE
    ===================================================== */

    cy.contains(
      "Session confirmed. The user has been notified.",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    /* =====================================================
       EXACT REQUEST SHOULD NOW BE CONFIRMED
    ===================================================== */

    cy.contains(
      "article.feature-card",
      bookingMessage,
      {
        timeout: 30000,
      }
    )
      .should("be.visible")
      .within(() => {
        cy.contains(
          "✓ Session confirmed"
        ).should(
          "be.visible"
        );

        cy.contains(
          "a",
          /Chat \/ voice message/i
        ).should(
          "be.visible"
        );

        cy.contains(
          /audio call/i
        ).should(
          "not.exist"
        );
      });

    /* =====================================================
       STEP 6 — EXPERT SESSIONS PAGE
    ===================================================== */

    cy.intercept(
      "GET",
      "**/api/sessions/expert*"
    ).as("expertSessions");

    cy.visit(
      "/expert/sessions"
    );

    cy.wait(
      "@expertSessions",
      {
        timeout: 30000,
      }
    ).then((interception) => {
      expect(
        interception.response,
        "expert sessions response"
      ).to.exist;

      expect(
        interception.response.statusCode
      ).to.eq(200);

      expect(
        interception.response.body
          ?.sessions
      ).to.be.an("array");
    });

    cy.contains(
      "h1",
      "My Sessions",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    cy.contains(
      /audio call/i
    ).should(
      "not.exist"
    );

    /* =====================================================
       FIND EXACT CREATED SESSION USING ALIAS
    ===================================================== */

    cy.get(
      "@createdSessionId"
    ).then((sessionId) => {
      const encodedSessionId =
        encodeURIComponent(
          sessionId
        );

      cy.get(
        `a[href="/session-chat/${encodedSessionId}"]`,
        {
          timeout: 30000,
        }
      )
        .should("be.visible")
        .and(
          "contain.text",
          "Chat / voice message"
        );

      /* ===================================================
         STEP 7 — OPEN CREATED SESSION CHAT
      =================================================== */

      cy.visit(
        `/session-chat/${encodedSessionId}`
      );

      cy.location(
        "pathname",
        {
          timeout: 20000,
        }
      ).should(
        "eq",
        `/session-chat/${sessionId}`
      );

      /* ===================================================
         PRIVATE CHAT PAGE
      =================================================== */

      cy.contains(
        "PRIVATE SESSION",
        {
          timeout: 30000,
        }
      ).should(
        "be.visible"
      );

      cy.contains(
        "h1",
        /Private support chat|Private chat with/i,
        {
          timeout: 30000,
        }
      ).should(
        "be.visible"
      );

      /* ===================================================
         FUTURE / OUTSIDE SESSION SHOULD BE READ-ONLY
      =================================================== */

      cy.contains(
        /Session has not started|Session active until|Chat history is read-only/i,
        {
          timeout: 30000,
        }
      ).should(
        "be.visible"
      );

      /* ===================================================
         RECOVERY KIT LINK EXISTS
      =================================================== */

      cy.contains(
        "a",
        "Recovery Kit"
      )
        .should("be.visible")
        .and(
          "have.attr",
          "href",
          "/vault-recovery"
        );

      /* ===================================================
         LIVE AUDIO CALLING MUST NOT EXIST
      =================================================== */

      cy.contains(
        /audio call/i
      ).should(
        "not.exist"
      );

      cy.contains(
        /start audio call/i
      ).should(
        "not.exist"
      );

      cy.contains(
        /test turn relay/i
      ).should(
        "not.exist"
      );
    });

    /* =====================================================
       FINAL LOGOUT
    ===================================================== */

    cy.logoutInnerVoice();
  });
});