describe("InnerVoice — Public & Authentication", () => {
  it("01 - production backend is healthy", () => {
    cy.request({
      method: "GET",
      url: "https://api.innervoice.salehaimtiaz.com/api/health",
      failOnStatusCode: true,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.success).to.eq(true);
    });
  });

  it("02 - landing page loads successfully", () => {
    cy.visit("/");

    cy.contains("InnerVoice").should("be.visible");

    cy.contains("Sign in").should("be.visible");

    cy.contains("Create your space").should("be.visible");
  });

  it("03 - Sign in button opens login page", () => {
    cy.visit("/");

    cy.contains("a", "Sign in")
      .should("be.visible")
      .click();

    cy.location("pathname").should("eq", "/login");

    cy.contains("h1", "Welcome back.")
      .should("be.visible");

    cy.get("#login-anonymous-id")
      .should("be.visible");

    cy.get("#login-password")
      .should("be.visible");
  });

  it("04 - Create your space opens registration", () => {
    cy.visit("/");

    cy.contains("a", "Create your space")
      .should("be.visible")
      .click();

    cy.location("pathname").should("eq", "/register");

    cy.contains("h1", "Create your account.")
      .should("be.visible");
  });

  it("05 - registration form has main fields", () => {
    cy.visit("/register");

    cy.get("#anonymousId")
      .should("be.visible");

    cy.get("#role")
      .should("be.visible");

    cy.get("#age")
      .should("be.visible");

    cy.get("#password")
      .should("be.visible");

    cy.get("#confirmPassword")
      .should("be.visible");
  });

  it("06 - expert role displays professional fields", () => {
    cy.visit("/register");

    cy.get("#role")
      .select("expert");

    cy.get("#professionalName")
      .should("be.visible");

    cy.get("#professionalEmail")
      .should("be.visible");

    cy.get("#licenseNumber")
      .should("be.visible");

    cy.get("#qualification")
      .should("be.visible");

    cy.get("#specialization")
      .should("be.visible");

    cy.get("#licenseImage")
      .should("exist");
  });

  it("07 - empty login form is blocked by required-field validation", () => {
    cy.visit("/login");

    cy.get("#login-anonymous-id")
      .should("have.attr", "required");

    cy.get("#login-password")
      .should("have.attr", "required");

    cy.contains("button", "Sign in")
      .click();

    cy.get("#login-anonymous-id")
      .then(($input) => {
        expect(
          $input[0].checkValidity()
        ).to.eq(false);

        expect(
          $input[0].validationMessage
        ).to.not.equal("");
      });

    cy.get("#login-password")
      .then(($input) => {
        expect(
          $input[0].checkValidity()
        ).to.eq(false);
      });

    cy.location("pathname")
      .should("eq", "/login");
  });

  it("08 - protected user dashboard cannot be opened while logged out", () => {
    cy.visit("/user/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/login");
  });

  it("09 - protected admin dashboard cannot be opened while logged out", () => {
    cy.visit("/admin/dashboard");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/login");
  });
});