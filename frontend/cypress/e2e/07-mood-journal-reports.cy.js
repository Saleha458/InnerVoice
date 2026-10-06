describe("InnerVoice — Mood, Journal & Reports", () => {
  it("tests locked private features without bypassing the vault", () => {
    /* =========================================
       LOGIN — ONLY ONCE
    ========================================= */

    cy.loginAsUser();

    /* =========================================
       MOOD
    ========================================= */

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

    cy.contains(
      "PRIVATE CHECK-IN"
    ).should("be.visible");

    cy.contains(
      /Unlock private vault|Create private vault/,
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      /same private passphrase as your Journal and Expert Chat/i
    ).should("be.visible");

    cy.get('input[type="password"]')
      .first()
      .should("be.visible")
      .should(($input) => {
        expect($input).to.have.attr("required");
        expect($input).to.have.attr("minlength", "16");
      });

    /* =========================================
       JOURNAL
    ========================================= */

    cy.visit("/journal");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/journal");

    cy.contains(
      "h1",
      "Journal",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "PRIVATE REFLECTION"
    ).should("be.visible");

    cy.contains(
      /Unlock your private vault|Create your private vault/,
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.get('input[type="password"]')
      .first()
      .should("be.visible")
      .should(($input) => {
        expect($input).to.have.attr("required");
        expect($input).to.have.attr("minlength", "16");
      });

    cy.contains(
      "a",
      "+ New entry"
    ).should("not.exist");

    /* =========================================
       DIRECT NEW JOURNAL ROUTE
    ========================================= */

    cy.visit("/journal/new");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/journal/new");

    cy.contains(
      /Unlock your private vault on\s*the Journal page first/i,
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "button",
      "Save encrypted entry"
    ).should("not.exist");

    /* =========================================
       REPORTS
    ========================================= */

    cy.visit("/reports");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/reports");

    cy.contains(
      "h1",
      "Your reports",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "PRIVATE SUPPORT"
    ).should("be.visible");

    cy.contains(
      /Unlock your private vault|Create your private vault/,
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.get(
      'input[placeholder="Private passphrase"]'
    )
      .should("be.visible")
      .should(($input) => {
        expect($input).to.have.attr("required");
        expect($input).to.have.attr("minlength", "16");
      });

    cy.contains(
      "a",
      "+ Create report"
    ).should("not.exist");

    /* =========================================
       DIRECT CREATE REPORT ROUTE
    ========================================= */

    cy.visit("/reports/new");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/reports/new");

    cy.contains(
      /Unlock your private vault first/i,
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "a",
      /Go to Journal/
    )
      .should("be.visible")
      .and(
        "have.attr",
        "href",
        "/journal"
      );

    cy.get("#report-description")
      .should("not.exist");

    cy.contains(
      "button",
      "Submit private report →"
    ).should("not.exist");

    /* =========================================
       FINISH ON USER DASHBOARD
    ========================================= */

    cy.visit("/user/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/user/dashboard"
    );
  });
});