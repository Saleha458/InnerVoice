describe("InnerVoice — Mood, Journal & Reports CRUD", () => {
  it("creates and cleans up mood/journal data and creates a private report", () => {
    const stamp = Date.now();

    const journalTitle =
      `Cypress Journal ${stamp}`;

    const journalContent =
      `This is an automated encrypted journal reflection created by Cypress at ${stamp}.`;

    const reportDescription =
      `Cypress private report functional test ${stamp}.`;

    /* =====================================================
       LOGIN
    ===================================================== */

    cy.loginAsUser();

    /* =====================================================
       MOOD PAGE
    ===================================================== */

    cy.visit("/mood");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/mood");

    cy.contains(
      "h1",
      "Mood & wellbeing",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    /* =====================================================
       VAULT PASSPHRASE
    ===================================================== */

    cy.env([
      "VAULT_PASSPHRASE",
    ]).then(
      ({
        VAULT_PASSPHRASE,
      }) => {
        expect(
          VAULT_PASSPHRASE,
          "VAULT_PASSPHRASE"
        )
          .to.be.a("string")
          .and.not.be.empty;

        expect(
          VAULT_PASSPHRASE.length
        ).to.be.gte(16);

        /* =================================================
           UNLOCK MOOD VAULT
        ================================================= */

        cy.get(
          'input[type="password"]'
        )
          .first()
          .should("be.visible")
          .clear()
          .type(
            VAULT_PASSPHRASE,
            {
              log: false,
            }
          );

        cy.contains(
          "button",
          "Unlock"
        )
          .should("be.visible")
          .and("be.enabled")
          .click();

        /* =================================================
           CONFIRM MOOD FORM READY
        ================================================= */

        cy.get(
          ".mood-checkin",
          {
            timeout: 30000,
          }
        ).should("be.visible");

        cy.contains(
          "h2",
          "How are you feeling today?"
        ).should("be.visible");

        /* =================================================
           SELECT GREAT
        ================================================= */

        cy.contains(
          '[aria-label="Choose your mood"] button',
          /Great/i
        )
          .should("be.visible")
          .click();

        cy.contains(
          '[aria-label="Choose your mood"] button',
          /Great/i
        ).should(
          "have.attr",
          "aria-pressed",
          "true"
        );

        /* =================================================
           DEFAULT INTENSITY = 5
        ================================================= */

        cy.get(
          ".mood-intensity strong"
        )
          .should("be.visible")
          .and(
            "contain.text",
            "5/10"
          );

        /*
         * IMPORTANT:
         * Mood note is optional.
         * We intentionally do NOT type into the
         * controlled textarea in this CRUD test.
         */

        /* =================================================
           CREATE MOOD
        ================================================= */

        cy.intercept(
          "POST",
          "**/api/moods**"
        ).as("createMood");

        cy.get(
          ".mood-checkin form"
        )
          .should("be.visible")
          .within(() => {
            cy.get(
              'button[type="submit"]'
            )
              .should("be.visible")
              .and("be.enabled")
              .click();
          });

        /* =================================================
           VERIFY MOOD CREATE RESPONSE
        ================================================= */

        cy.wait(
          "@createMood",
          {
            timeout: 30000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response,
              "mood create response"
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.be.within(
              200,
              299
            );

            expect(
              interception.response.body
                ?.success
            ).to.eq(true);
          }
        );

        /* =================================================
           VERIFY MOOD SUCCESS MESSAGE
        ================================================= */

        cy.contains(
          "Your private check-in has been saved on this device and stored encrypted.",
          {
            timeout: 20000,
          }
        ).should("be.visible");

        /* =================================================
           VERIFY NEWEST MOOD ENTRY

           MoodTracker inserts the newly created mood
           into history immediately.
        ================================================= */

        cy.get(
          "article.mood-history-entry",
          {
            timeout: 30000,
          }
        )
          .first()
          .should("be.visible")
          .within(() => {
            cy.contains(
              /Great/i
            ).should("be.visible");

            cy.contains(
              "Feeling strength:"
            ).should("be.visible");

            cy.contains(
              "5/10"
            ).should("be.visible");
          });

        /* =================================================
           DELETE NEWEST MOOD ENTRY
        ================================================= */

        cy.intercept(
          "DELETE",
          "**/api/moods/**"
        ).as("deleteMood");

        cy.window().then(
          (win) => {
            cy.stub(
              win,
              "confirm"
            ).returns(true);
          }
        );

        cy.get(
          "article.mood-history-entry"
        )
          .first()
          .within(() => {
            cy.get(
              'button[aria-label^="Delete mood check-in from"]'
            )
              .should("be.visible")
              .and("be.enabled")
              .click();
          });

        cy.wait(
          "@deleteMood",
          {
            timeout: 30000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.be.within(
              200,
              299
            );
          }
        );

        cy.contains(
          "Mood check-in deleted.",
          {
            timeout: 15000,
          }
        ).should("be.visible");

        /* =================================================
           JOURNAL
           SPA navigation keeps vault unlocked
        ================================================= */

        cy.get(
          '[aria-label="Dashboard navigation"]'
        )
          .contains("Journal")
          .click();

        cy.location(
          "pathname",
          {
            timeout: 15000,
          }
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
        ).should("be.visible");

        cy.contains(
          "Device-side encryption active",
          {
            timeout: 30000,
          }
        ).should("be.visible");

        cy.contains(
          "a",
          "+ New entry"
        )
          .should("be.visible")
          .click();

        /* =================================================
           NEW JOURNAL PAGE
        ================================================= */

        cy.location(
          "pathname",
          {
            timeout: 15000,
          }
        ).should(
          "eq",
          "/journal/new"
        );

        cy.contains(
          "h1",
          "New journal entry",
          {
            timeout: 20000,
          }
        ).should("be.visible");

        /* =================================================
           JOURNAL TITLE
        ================================================= */

        cy.get(
          'input[placeholder="A title for today"]'
        )
          .should("be.visible")
          .clear()
          .type(
            journalTitle
          );

        /* =================================================
           JOURNAL MOOD
        ================================================= */

        cy.get(
          "form.feature-card select.form-input"
        )
          .should("be.visible")
          .select("Good");

        /* =================================================
           JOURNAL CONTENT
        ================================================= */

        cy.get(
          "form.feature-card textarea.form-input"
        )
          .should("be.visible")
          .clear()
          .type(
            journalContent
          );

        /* =================================================
           CREATE JOURNAL
        ================================================= */

        cy.intercept(
          "POST",
          "**/api/journal**"
        ).as("createJournal");

        cy.get(
          'form.feature-card button[type="submit"]'
        )
          .should("be.visible")
          .and("be.enabled")
          .click();

        cy.wait(
          "@createJournal",
          {
            timeout: 30000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.be.within(
              200,
              299
            );

            expect(
              interception.response.body
                ?.success
            ).to.eq(true);
          }
        );

        /* =================================================
           VERIFY JOURNAL ENTRY
        ================================================= */

        cy.location(
          "pathname",
          {
            timeout: 20000,
          }
        ).should(
          "eq",
          "/journal"
        );

        cy.contains(
          "article.feature-card",
          journalTitle,
          {
            timeout: 30000,
          }
        )
          .should("be.visible")
          .within(() => {
            cy.contains(
              journalTitle
            ).should("be.visible");

            cy.contains(
              "Good"
            ).should("be.visible");

            cy.contains(
              /Device encrypted/i
            ).should("be.visible");

            cy.contains(
              journalContent
            ).should("be.visible");
          });

        /* =================================================
           DELETE JOURNAL
        ================================================= */

        cy.intercept(
          "DELETE",
          "**/api/journal/**"
        ).as("deleteJournal");

        cy.contains(
          "article.feature-card",
          journalTitle
        ).within(() => {
          cy.get(
            "button.danger-button"
          )
            .should("be.visible")
            .and("be.enabled")
            .click();
        });

        cy.wait(
          "@deleteJournal",
          {
            timeout: 30000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.be.within(
              200,
              299
            );
          }
        );

        cy.contains(
          "article.feature-card",
          journalTitle
        ).should("not.exist");

        /* =================================================
           REPORTS
        ================================================= */

        cy.get(
          '[aria-label="Dashboard navigation"]'
        )
          .contains("Reports")
          .click();

        cy.location(
          "pathname",
          {
            timeout: 15000,
          }
        ).should(
          "eq",
          "/reports"
        );

        cy.contains(
          "h1",
          "Your reports",
          {
            timeout: 30000,
          }
        ).should("be.visible");

        /* =================================================
           OPEN CREATE REPORT
        ================================================= */

        cy.intercept(
          "GET",
          "**/api/reports/recipient**"
        ).as(
          "reportRecipient"
        );

        cy.contains(
          "a",
          "+ Create report",
          {
            timeout: 30000,
          }
        )
          .should("be.visible")
          .click();

        cy.location(
          "pathname",
          {
            timeout: 15000,
          }
        ).should(
          "eq",
          "/reports/new"
        );

        cy.contains(
          "h1",
          "Share a concern",
          {
            timeout: 20000,
          }
        ).should("be.visible");

        /* =================================================
           RECIPIENT LOOKUP
        ================================================= */

        cy.wait(
          "@reportRecipient",
          {
            timeout: 30000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.be.within(
              200,
              299
            );
          }
        );

        /* =================================================
           REPORT CATEGORY
        ================================================= */

        cy.get(
          "#report-category"
        )
          .should("be.visible")
          .select("other");

        /* =================================================
           REPORT SEVERITY
        ================================================= */

        cy.get(
          "#report-severity"
        )
          .should("be.visible")
          .select("low");

        /* =================================================
           REPORT DESCRIPTION
        ================================================= */

        cy.get(
          "#report-description"
        )
          .should("be.visible")
          .clear()
          .type(
            reportDescription
          );

        /* =================================================
           SUBMIT DISABLED BEFORE CONSENT
        ================================================= */

        cy.get(
          "button.iv-report-submit"
        ).should(
          "be.disabled"
        );

        /* =================================================
           PRIVACY CONSENT
        ================================================= */

        cy.get(
          ".iv-report-privacy-note input[type='checkbox']"
        )
          .should("be.visible")
          .check();

        cy.get(
          "button.iv-report-submit"
        )
          .should("be.visible")
          .and("be.enabled");

        /* =================================================
           CREATE REPORT
        ================================================= */

        cy.intercept(
          "POST",
          "**/api/reports**"
        ).as("createReport");

        cy.get(
          "button.iv-report-submit"
        ).click();

        cy.wait(
          "@createReport",
          {
            timeout: 30000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response,
              "report response"
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.be.within(
              200,
              299
            );

            expect(
              interception.response.body
                ?.success
            ).to.eq(true);
          }
        );

        /* =================================================
           VERIFY REPORT SUCCESS
        ================================================= */

        cy.location(
          "pathname",
          {
            timeout: 20000,
          }
        ).should(
          "eq",
          "/reports"
        );

        cy.contains(
          "Report submitted successfully.",
          {
            timeout: 30000,
          }
        ).should("be.visible");

        /* =================================================
           FINAL
        ================================================= */

        cy.contains(
          "h1",
          "Your reports"
        ).should("be.visible");
      }
    );
  });
});