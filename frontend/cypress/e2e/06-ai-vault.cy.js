
describe("InnerVoice — AI Support & Private Vault", () => {
  it("tests vault, AI chat, consent, response and recovery navigation", () => {
    cy.loginAsUser();
    cy.visit("/chat");

    cy.location("pathname", { timeout: 15000 })
      .should("eq", "/chat");

    cy.contains("h1", "AI Support", { timeout: 20000 })
      .should("be.visible");

    cy.contains("PRIVATE AI COMPANION")
      .should("be.visible");

    cy.contains("h2", "Unlock AI history", {
      timeout: 30000
    }).should("be.visible");

    cy.contains(
      "a",
      /Forgot passphrase\? Use Recovery Kit/i
    ).should("have.attr", "href", "/vault-recovery");

    cy.env(["VAULT_PASSPHRASE"]).then(
      ({ VAULT_PASSPHRASE }) => {
        expect(VAULT_PASSPHRASE)
          .to.be.a("string");

        expect(VAULT_PASSPHRASE.length)
          .to.be.gte(8);

        cy.get('input[placeholder="Vault passphrase"]')
          .should("be.visible")
          .type(VAULT_PASSPHRASE, { log: false });

        cy.contains("button", "Unlock vault")
          .click();

        cy.contains("InnerVoice AI", {
          timeout: 30000
        }).should("be.visible");

        cy.contains("Text-based support")
          .should("be.visible");

        cy.contains("button", "Lock vault")
          .should("be.visible");

        cy.contains("a", /Starred messages/i)
          .should("have.attr", "href", "/starred");

        // Ensure the old unwanted heading text is absent.
        cy.contains(
          "Your saved chat history uses your private vault."
        ).should("not.exist");

        // Preserve the privacy notice beside message input.
        cy.contains("Your vault key is not sent to Gemini.")
          .should("be.visible");

        cy.contains(
          /may be processed by InnerVoice and Google Gemini/i
        ).should("be.visible");

        cy.window().then(win => {
          cy.stub(win, "confirm").returns(true);
        });

        cy.contains("button", /New chat/i)
          .should("be.enabled")
          .click();

        cy.contains("button", /Send message/i)
          .should("be.disabled");

        const message =
          "Cypress AI test: please reply with one short supportive sentence.";

        cy.get("#ai-message")
          .should("be.visible")
          .type(message);

        cy.contains("button", /Send message/i)
          .should("be.disabled");

        cy.contains(
          "label",
          /I agree that my message and recent context/i
        )
          .find('input[type="checkbox"]')
          .check()
          .should("be.checked");

        cy.intercept("POST", "**/api/ai/chat")
          .as("aiChatRequest");

        cy.contains("button", /Send message/i)
          .should("be.enabled")
          .click();

        cy.contains(message, {
          timeout: 20000
        }).should("be.visible");

        cy.wait("@aiChatRequest", {
          timeout: 60000
        }).then(({ response }) => {
          expect(response).to.exist;
          expect(response.statusCode).to.eq(200);
          expect(response.body.success).to.eq(true);
          expect(response.body.response)
            .to.be.a("string")
            .and.not.be.empty;
        });

        cy.get(".iv-ai-message-row-bot", {
          timeout: 30000
        })
          .last()
          .should("be.visible")
          .contains("InnerVoice AI");

        cy.get(".iv-ai-message-row-bot")
          .last()
          .find("button")
          .should("exist");

        cy.contains(
          "h2",
          "Want to speak with an expert?"
        ).should("be.visible");

        cy.contains("a", /Find an expert/i)
          .should("have.attr", "href", "/experts");

        cy.contains("button", "Lock vault")
          .click();

        cy.contains("h2", "Unlock AI history", {
          timeout: 15000
        }).should("be.visible");

        cy.get('input[placeholder="Vault passphrase"]')
          .should("be.visible");

        cy.visit("/vault-recovery");

        cy.location("pathname")
          .should("eq", "/vault-recovery");

        cy.contains("h1", "Recovery Kit", {
          timeout: 20000
        }).should("be.visible");

        cy.contains("PRIVATE VAULT")
          .should("be.visible");

        cy.contains(
          "h2",
          "1. Create a kit for your existing vault"
        ).should("be.visible");

        cy.contains("Current vault passphrase")
          .should("be.visible");

        cy.contains("Repeat passphrase")
          .should("be.visible");

        cy.contains(
          "button",
          /Verify passphrase & download encrypted kit/i
        ).should("exist");

        cy.contains(
          "h2",
          "2. Test / unlock using your kit"
        ).should("be.visible");

        cy.contains("Recovery JSON")
          .should("be.visible");

        cy.contains("64-character recovery code")
          .should("be.visible");

        cy.contains(
          "button",
          /Test recovery and unlock existing vault/i
        ).should("exist");

        cy.contains(
          /Test your backup on a second device/i
        ).should("be.visible");
      }
    );
  });
});
