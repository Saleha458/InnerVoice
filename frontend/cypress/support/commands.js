const roleConfig = {
  user: {
    idKey: "USER_ID",
    passwordKey: "USER_PASSWORD",
    dashboard: "/user/dashboard",
  },

  expert: {
    idKey: "EXPERT_ID",
    passwordKey: "EXPERT_PASSWORD",
    dashboard: "/expert/dashboard",
  },

  parent: {
    idKey: "PARENT_ID",
    passwordKey: "PARENT_PASSWORD",
    dashboard: "/parent/dashboard",
  },

  admin: {
    idKey: "ADMIN_ID",
    passwordKey: "ADMIN_PASSWORD",
    dashboard: "/admin/dashboard",
  },
};

Cypress.Commands.add("loginAs", (role) => {
  const config = roleConfig[role];

  if (!config) {
    throw new Error(`Unknown role: ${role}`);
  }

  cy.env([
    config.idKey,
    config.passwordKey,
  ]).then((values) => {
    const anonymousId =
      values[config.idKey];

    const password =
      values[config.passwordKey];

    if (!anonymousId || !password) {
      throw new Error(
        `${config.idKey} or ${config.passwordKey} is missing from cypress.env.json`
      );
    }

    cy.visit("/login");

    cy.get("#login-anonymous-id")
      .should("be.visible")
      .clear()
      .type(anonymousId, {
        log: false,
      });

    cy.get("#login-password")
      .should("be.visible")
      .clear()
      .type(password, {
        log: false,
      });

    cy.contains("button", "Sign in")
      .should("be.enabled")
      .click();

    cy.location("pathname", {
      timeout: 20000,
    }).should(
      "eq",
      config.dashboard
    );

    cy.get(
      '[aria-label="Dashboard sidebar"]',
      {
        timeout: 15000,
      }
    ).should("be.visible");
  });
});

Cypress.Commands.add(
  "loginAsUser",
  () => {
    cy.loginAs("user");
  }
);

Cypress.Commands.add(
  "loginAsExpert",
  () => {
    cy.loginAs("expert");
  }
);

Cypress.Commands.add(
  "loginAsParent",
  () => {
    cy.loginAs("parent");
  }
);

Cypress.Commands.add(
  "loginAsAdmin",
  () => {
    cy.loginAs("admin");
  }
);

Cypress.Commands.add(
  "logoutInnerVoice",
  () => {
    cy.contains(
      "button",
      "Log out"
    )
      .should("be.visible")
      .click();

    cy.location("pathname", {
      timeout: 15000,
    }).should(
      "eq",
      "/login"
    );
  }
);