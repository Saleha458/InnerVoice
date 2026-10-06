describe("InnerVoice — AI Support & Private Vault", () => {
  it("tests vault unlock, AI consent, AI response and vault lock", () => {
    /* =========================================
       LOGIN — ONLY ONCE
    ========================================= */

    cy.loginAsUser();

    /* =========================================
       OPEN AI SUPPORT
    ========================================= */

    cy.visit("/chat");

    cy.location("pathname", {
      timeout: 15000,
    }).should("eq", "/chat");

    cy.contains(
      "h1",
      "AI Support",
      {
        timeout: 20000,
      }
    ).should("be.visible");

    cy.contains(
      "PRIVATE AI COMPANION"
    ).should("be.visible");

    /* =========================================
       EXISTING VAULT MUST BE PRESENT
    ========================================= */

    cy.contains(
      "h2",
      "Unlock AI history",
      {
        timeout: 30000,
      }
    ).should("be.visible");

    cy.contains(
      /Use the same passphrase as your Journal/i
    ).should("be.visible");

    cy.contains(
      "a",
      /Forgot passphrase\? Use Recovery Kit/i
    )
      .should("be.visible")
      .and(
        "have.attr",
        "href",
        "/vault-recovery"
      );

    /* =========================================
       GET VAULT PASSPHRASE — CYPRESS 16
    ========================================= */

    cy.env([
      "VAULT_PASSPHRASE",
    ]).then(
      ({
        VAULT_PASSPHRASE,
      }) => {
        expect(
          VAULT_PASSPHRASE,
          "VAULT_PASSPHRASE"
        ).to.be.a("string");

        expect(
          VAULT_PASSPHRASE.length
        ).to.be.gte(16);

        /* =====================================
           UNLOCK VAULT
        ===================================== */

        cy.get(
          'input[placeholder="Vault passphrase"]'
        )
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
          "Unlock vault"
        )
          .should("be.enabled")
          .click();

        /* =====================================
           CONFIRM VAULT UNLOCK
        ===================================== */

        cy.contains(
          "InnerVoice AI",
          {
            timeout: 30000,
          }
        ).should("be.visible");

        cy.contains(
          "Text-based support"
        ).should("be.visible");

        cy.contains(
          "button",
          "Lock vault"
        ).should("be.visible");

        cy.contains(
          "a",
          /Starred messages/i
        )
          .should("be.visible")
          .and(
            "have.attr",
            "href",
            "/starred"
          );

        /* =====================================
           PRIVACY INFORMATION
        ===================================== */

        cy.contains(
          "Your vault key is not sent to Gemini."
        ).should("be.visible");

        cy.contains(
          /may be processed by InnerVoice and Google Gemini/i
        ).should("be.visible");

        /* =====================================
           START NEW CHAT
        ===================================== */

        cy.window().then(
          (win) => {
            cy.stub(
              win,
              "confirm"
            ).returns(true);
          }
        );

        cy.contains(
          "button",
          /New chat/i
        )
          .should("be.enabled")
          .click();

        cy.location(
          "pathname"
        ).should(
          "eq",
          "/chat"
        );

        /* =====================================
           EMPTY MESSAGE => SEND DISABLED
        ===================================== */

        cy.contains(
          "button",
          /Send message/i
        ).should(
          "be.disabled"
        );

        /* =====================================
           TYPE TEST MESSAGE
        ===================================== */

        const testMessage =
          "Cypress AI test: please reply with one short supportive sentence.";

        cy.get(
          "#ai-message"
        )
          .should(
            "be.visible"
          )
          .clear()
          .type(
            testMessage
          );

        /* =====================================
           WITHOUT CONSENT SEND STAYS DISABLED
        ===================================== */

        cy.contains(
          "button",
          /Send message/i
        ).should(
          "be.disabled"
        );

        /* =====================================
           ENABLE CONSENT
        ===================================== */

        cy.contains(
          "label",
          /I agree that my message and recent context/i
        )
          .find(
            'input[type="checkbox"]'
          )
          .should(
            "not.be.checked"
          )
          .check()
          .should(
            "be.checked"
          );

        cy.contains(
          "button",
          /Send message/i
        ).should(
          "be.enabled"
        );

        /* =====================================
           INTERCEPT AI REQUEST
        ===================================== */

        cy.intercept(
          "POST",
          "**/api/ai/chat"
        ).as(
          "aiChatRequest"
        );

        /* =====================================
           SEND MESSAGE
        ===================================== */

        cy.contains(
          "button",
          /Send message/i
        ).click();

        /* =====================================
           USER MESSAGE VISIBLE
        ===================================== */

        cy.contains(
          testMessage,
          {
            timeout: 20000,
          }
        ).should(
          "be.visible"
        );

        /* =====================================
           BACKEND AI RESPONSE
        ===================================== */

        cy.wait(
          "@aiChatRequest",
          {
            timeout: 60000,
          }
        ).then(
          (interception) => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception.response.statusCode
            ).to.eq(200);

            expect(
              interception.response.body.success
            ).to.eq(true);

            expect(
              interception.response.body.response
            ).to.be.a(
              "string"
            );

            expect(
              interception.response.body.response.trim()
            ).to.not.equal(
              ""
            );
          }
        );

        /* =====================================
           AI RESPONSE DISPLAYED
        ===================================== */

        cy.get(
          ".iv-ai-message-row-bot",
          {
            timeout: 30000,
          }
        )
          .last()
          .should(
            "be.visible"
          );

        cy.get(
          ".iv-ai-message-row-bot"
        )
          .last()
          .contains(
            "InnerVoice AI"
          )
          .should(
            "be.visible"
          );

        /* =====================================
           STAR FEATURE EXISTS
        ===================================== */

        cy.get(
          ".iv-ai-message-row-bot"
        )
          .last()
          .find(
            "button"
          )
          .should(
            "exist"
          );

        /* =====================================
           HUMAN SUPPORT FALLBACK
        ===================================== */

        cy.contains(
          "h2",
          "Want to speak with an expert?"
        ).should(
          "be.visible"
        );

        cy.contains(
          "a",
          /Find an expert/i
        )
          .should(
            "be.visible"
          )
          .and(
            "have.attr",
            "href",
            "/experts"
          );

        /* =====================================
           LOCK VAULT
        ===================================== */

        cy.contains(
          "button",
          "Lock vault"
        ).click();

        cy.contains(
          "h2",
          "Unlock AI history",
          {
            timeout: 15000,
          }
        ).should(
          "be.visible"
        );

        cy.get(
          'input[placeholder="Vault passphrase"]'
        ).should(
          "be.visible"
        );

        /* =====================================
           RECOVERY KIT PAGE — SAFE CHECK ONLY
        ===================================== */

        cy.visit(
          "/vault-recovery"
        );

        cy.location(
          "pathname"
        ).should(
          "eq",
          "/vault-recovery"
        );

        cy.contains(
          "h1",
          "Recovery Kit",
          {
            timeout: 20000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "PRIVATE VAULT"
        ).should(
          "be.visible"
        );

        cy.contains(
          "h2",
          "1. Create a kit for your existing vault"
        ).should(
          "be.visible"
        );

        cy.contains(
          "Current vault passphrase"
        ).should(
          "be.visible"
        );

        cy.contains(
          "Repeat passphrase"
        ).should(
          "be.visible"
        );

        cy.contains(
          "button",
          /Verify passphrase & download encrypted kit/i
        ).should(
          "exist"
        );

        cy.contains(
          "h2",
          "2. Test / unlock using your kit"
        ).should(
          "be.visible"
        );

        cy.contains(
          "Recovery JSON"
        ).should(
          "be.visible"
        );

        cy.contains(
          "64-character recovery code"
        ).should(
          "be.visible"
        );

        cy.contains(
          "button",
          /Test recovery and unlock existing vault/i
        ).should(
          "exist"
        );

        cy.contains(
          /Test your backup on a second device/i
        ).should(
          "be.visible"
        );
      }
    );
  });
});