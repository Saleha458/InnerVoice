
describe("InnerVoice — Mood, Journal & Reports CRUD", () => {
  it("tests encrypted mood, journal and report workflows", () => {
    const stamp = Date.now();

    const journalTitle = `Cypress Journal ${stamp}`;

    const journalContent =
      `Automated encrypted journal reflection ${stamp}.`;

    const reportDescription =
      `Cypress private report functional test ${stamp}.`;

    cy.loginAsUser();
    cy.visit("/mood");

    cy.location("pathname", {
      timeout: 15000
    }).should("eq", "/mood");

    cy.contains("h1", "Mood & wellbeing", {
      timeout: 20000
    }).should("be.visible");

    cy.env(["VAULT_PASSPHRASE"]).then(
      ({ VAULT_PASSPHRASE }) => {
        expect(VAULT_PASSPHRASE)
          .to.be.a("string")
          .and.not.be.empty;

        expect(VAULT_PASSPHRASE.length)
          .to.be.gte(8);

        cy.get('input[type="password"]')
          .first()
          .should("be.visible")
          .type(VAULT_PASSPHRASE, { log: false });

        cy.contains("button", "Unlock")
          .should("be.enabled")
          .click();

        cy.get(".mood-checkin", {
          timeout: 30000
        }).should("be.visible");

        cy.contains(
          "h2",
          "How are you feeling today?"
        ).should("be.visible");

        // Choose mood
        cy.contains(
          '[aria-label="Choose your mood"] button',
          /Great/i
        ).click();

        cy.contains(
          '[aria-label="Choose your mood"] button',
          /Great/i
        ).should("have.attr", "aria-pressed", "true");

        cy.get(".mood-intensity strong")
          .should("contain.text", "5/10");

        cy.intercept("POST", "**/api/moods**")
          .as("createMood");

        cy.get(".mood-checkin form")
          .find('button[type="submit"]')
          .should("be.enabled")
          .click();

        cy.wait("@createMood", {
          timeout: 30000
        }).then(({ response }) => {
          expect(response).to.exist;
          expect(response.statusCode)
            .to.be.within(200, 299);
          expect(response.body.success).to.eq(true);
        });

        cy.contains(
          "Your private check-in has been saved on this device and stored encrypted.",
          { timeout: 20000 }
        ).should("be.visible");

        cy.get("article.mood-history-entry", {
          timeout: 30000
        })
          .first()
          .should("be.visible")
          .within(() => {
            cy.contains(/Great/i).should("be.visible");
            cy.contains("Feeling strength:")
              .should("be.visible");
            cy.contains("5/10").should("be.visible");
          });

        // Delete created mood
        cy.intercept("DELETE", "**/api/moods/**")
          .as("deleteMood");

        cy.window().then(win => {
          cy.stub(win, "confirm").returns(true);
        });

        cy.get("article.mood-history-entry")
          .first()
          .find(
            'button[aria-label^="Delete mood check-in from"]'
          )
          .click();

        cy.wait("@deleteMood", {
          timeout: 30000
        }).its("response.statusCode")
          .should("be.within", 200, 299);

        cy.contains("Mood check-in deleted.", {
          timeout: 15000
        }).should("be.visible");

        // Journal — maintain unlocked SPA session
        cy.get('[aria-label="Dashboard navigation"]')
          .contains("Journal")
          .click();

        cy.location("pathname")
          .should("eq", "/journal");

        cy.contains("Device-side encryption active", {
          timeout: 30000
        }).should("be.visible");

        cy.contains("a", "+ New entry")
          .click();

        cy.location("pathname")
          .should("eq", "/journal/new");

        cy.contains("h1", "New journal entry")
          .should("be.visible");

        cy.get('input[placeholder="A title for today"]')
          .type(journalTitle);

        cy.get("form.feature-card select.form-input")
          .select("Good");

        cy.get("form.feature-card textarea.form-input")
          .type(journalContent);

        cy.intercept("POST", "**/api/journal**")
          .as("createJournal");

        cy.get(
          'form.feature-card button[type="submit"]'
        ).click();

        cy.wait("@createJournal", {
          timeout: 30000
        }).then(({ response }) => {
          expect(response).to.exist;
          expect(response.statusCode)
            .to.be.within(200, 299);
          expect(response.body.success).to.eq(true);
        });

        cy.location("pathname", {
          timeout: 20000
        }).should("eq", "/journal");

        cy.contains(
          "article.feature-card",
          journalTitle,
          { timeout: 30000 }
        )
          .should("be.visible")
          .within(() => {
            cy.contains(journalTitle)
              .should("be.visible");
            cy.contains("Good")
              .should("be.visible");
            cy.contains(/Device encrypted/i)
              .should("be.visible");
            cy.contains(journalContent)
              .should("be.visible");
          });

        // Delete test journal entry
        cy.intercept("DELETE", "**/api/journal/**")
          .as("deleteJournal");

        cy.contains(
          "article.feature-card",
          journalTitle
        )
          .find("button.danger-button")
          .click();

        cy.wait("@deleteJournal", {
          timeout: 30000
        }).its("response.statusCode")
          .should("be.within", 200, 299);

        cy.contains(
          "article.feature-card",
          journalTitle
        ).should("not.exist");

        // Reports
        cy.get('[aria-label="Dashboard navigation"]')
          .contains("Reports")
          .click();

        cy.location("pathname")
          .should("eq", "/reports");

        cy.contains("h1", "Your reports", {
          timeout: 30000
        }).should("be.visible");

        cy.intercept(
          "GET",
          "**/api/reports/recipient**"
        ).as("reportRecipient");

        cy.contains("a", "+ Create report", {
          timeout: 30000
        }).click();

        cy.location("pathname")
          .should("eq", "/reports/new");

        cy.contains("h1", "Share a concern")
          .should("be.visible");

        cy.wait("@reportRecipient", {
          timeout: 30000
        }).its("response.statusCode")
          .should("be.within", 200, 299);

        cy.get("#report-category")
          .select("other");

        cy.get("#report-severity")
          .select("low");

        cy.get("#report-description")
          .type(reportDescription);

        cy.get("button.iv-report-submit")
          .should("be.disabled");

        cy.get(
          ".iv-report-privacy-note input[type='checkbox']"
        ).check();

        cy.get("button.iv-report-submit")
          .should("be.enabled");

        cy.intercept("POST", "**/api/reports**")
          .as("createReport");

        cy.get("button.iv-report-submit")
          .click();

        cy.wait("@createReport", {
          timeout: 30000
        }).then(({ response }) => {
          expect(response).to.exist;
          expect(response.statusCode)
            .to.be.within(200, 299);
          expect(response.body.success).to.eq(true);
        });

        cy.location("pathname", {
          timeout: 20000
        }).should("eq", "/reports");

        cy.contains("Report submitted successfully.", {
          timeout: 30000
        }).should("be.visible");

        cy.contains("h1", "Your reports")
          .should("be.visible");
      }
    );
  });
});
