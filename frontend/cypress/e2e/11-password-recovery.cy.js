describe("InnerVoice — Password Recovery", () => {
  const recoveryQuestionId =
    "favorite_writer";

  const recoveryQuestionText =
    "Who is a writer you will always remember?";

  const recoveryAnswer =
    "cypress private recovery answer 2026";

  const wrongRecoveryAnswer =
    "this answer is deliberately wrong";

  const temporaryPassword =
    "TempRecovery#2026A";

  const backendBaseUrl =
    "https://api.innervoice.salehaimtiaz.com/api";

  let userId = "";
  let originalPassword = "";

  /* =====================================================
     SAFETY CLEANUP

     If the main recovery test fails after changing the
     password, Cypress attempts to restore the original
     test password automatically.
  ===================================================== */

  afterEach(() => {
    if (
      !userId ||
      !originalPassword
    ) {
      return;
    }

    cy.request({
      method: "POST",

      url:
        `${backendBaseUrl}/auth/recovery/reset`,

      failOnStatusCode:
        false,

      body: {
        anonymousId:
          userId,

        recoveryAnswer,

        newPassword:
          originalPassword,

        confirmPassword:
          originalPassword,
      },
    }).then(
      response => {
        cy.log(
          `Recovery cleanup status: ${response.status}`
        );
      }
    );
  });

  /* =====================================================
     TEST 1
     REGISTRATION UI
  ===================================================== */

  it("shows recovery question fields during registration", () => {
    cy.visit(
      "/register"
    );

    cy.location(
      "pathname"
    ).should(
      "eq",
      "/register"
    );

    cy.contains(
      "h1",
      "Create your account.",
      {
        timeout: 20000,
      }
    ).should(
      "be.visible"
    );

    cy.get(
      "#recoveryQuestionId"
    )
      .should(
        "be.visible"
      )
      .and(
        "have.attr",
        "required"
      );

    cy.get(
      "#recoveryQuestionId option"
    ).should(
      "have.length.greaterThan",
      1
    );

    cy.get(
      "#recoveryAnswer"
    )
      .should(
        "be.visible"
      )
      .and(
        "have.attr",
        "type",
        "password"
      )
      .and(
        "have.attr",
        "required"
      );

    cy.get(
      "#recoveryAnswer"
    ).should(
      $input => {
        expect(
          $input
        ).to.have.attr(
          "minlength",
          "4"
        );

        expect(
          $input
        ).to.have.attr(
          "maxlength",
          "100"
        );
      }
    );

    cy.contains(
      /stored as a secure hash/i
    ).should(
      "be.visible"
    );

    cy.contains(
      "a",
      "Sign in"
    ).should(
      "be.visible"
    );
  });

  /* =====================================================
     TEST 2
     EXISTING USER → SETUP → WRONG ANSWER →
     RESET → OLD PASSWORD REJECTED →
     NEW PASSWORD WORKS → RESTORE ORIGINAL PASSWORD
  ===================================================== */

  it("configures and completes anonymous password recovery safely", () => {
    cy.env([
      "USER_ID",
      "USER_PASSWORD",
    ]).then(
      ({
        USER_ID,
        USER_PASSWORD,
      }) => {
        expect(
          USER_ID,
          "USER_ID"
        )
          .to.be.a(
            "string"
          )
          .and.not.be
          .empty;

        expect(
          USER_PASSWORD,
          "USER_PASSWORD"
        )
          .to.be.a(
            "string"
          )
          .and.not.be
          .empty;

        userId =
          USER_ID;

        originalPassword =
          USER_PASSWORD;

        /* =============================================
           LOGIN WITH CURRENT PASSWORD
        ============================================= */

        cy.loginAsUser();

        /* =============================================
           OPEN PROFILE
        ============================================= */

        cy.visit(
          "/profile"
        );

        cy.location(
          "pathname",
          {
            timeout:
              15000,
          }
        ).should(
          "eq",
          "/profile"
        );

        cy.contains(
          "h1",
          /My profile|Your Profile/i,
          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "h2",
          "Account & security",
          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "h3",
          "Password recovery"
        ).should(
          "be.visible"
        );

        /* =============================================
           CONFIGURE / UPDATE RECOVERY QUESTION
        ============================================= */

        cy.intercept(
          "POST",
          "**/api/auth/recovery/setup"
        ).as(
          "setupRecovery"
        );

        cy.get(
          "#ivp-recovery-question"
        )
          .should(
            "be.visible"
          )
          .select(
            recoveryQuestionId
          );

        cy.get(
          "#ivp-recovery-answer"
        )
          .should(
            "be.visible"
          )
          .clear()
          .type(
            recoveryAnswer,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#ivp-recovery-password"
        )
          .should(
            "be.visible"
          )
          .clear()
          .type(
            originalPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.contains(
          "button",
          /Set recovery question|Update recovery question/i
        )
          .should(
            "be.enabled"
          )
          .click();

        cy.wait(
          "@setupRecovery",
          {
            timeout:
              30000,
          }
        ).then(
          interception => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception
                .response
                .statusCode
            ).to.eq(
              200
            );

            expect(
              interception
                .response
                .body
                ?.success
            ).to.eq(
              true
            );
          }
        );

        cy.contains(
          "Password recovery question saved successfully.",
          {
            timeout:
              15000,
          }
        ).should(
          "be.visible"
        );

        /* =============================================
           LOG OUT
        ============================================= */

        cy.logoutInnerVoice();

        /* =============================================
           FORGOT PASSWORD LINK
        ============================================= */

        cy.contains(
          "a",
          "Forgot password?"
        )
          .should(
            "be.visible"
          )
          .click();

        cy.location(
          "pathname",
          {
            timeout:
              15000,
          }
        ).should(
          "eq",
          "/forgot-password"
        );

        cy.contains(
          "h1",
          "Reset your password.",
          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        /* =============================================
           LOAD SELECTED RECOVERY QUESTION
        ============================================= */

        cy.intercept(
          "POST",
          "**/api/auth/recovery/question"
        ).as(
          "loadRecoveryQuestion"
        );

        cy.get(
          "#forgot-anonymous-id"
        )
          .should(
            "be.visible"
          )
          .clear()
          .type(
            userId,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.contains(
          "button",
          "Show my recovery question"
        )
          .should(
            "be.enabled"
          )
          .click();

        cy.wait(
          "@loadRecoveryQuestion",
          {
            timeout:
              30000,
          }
        ).then(
          interception => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception
                .response
                .statusCode
            ).to.eq(
              200
            );

            expect(
              interception
                .response
                .body
                ?.recoveryQuestion
            ).to.eq(
              recoveryQuestionText
            );
          }
        );

        cy.contains(
          recoveryQuestionText
        ).should(
          "be.visible"
        );

        /* =============================================
           WRONG ANSWER MUST FAIL
        ============================================= */

        cy.get(
          "#recovery-answer"
        )
          .should(
            "be.visible"
          )
          .clear()
          .type(
            wrongRecoveryAnswer,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#new-password"
        )
          .clear()
          .type(
            temporaryPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#confirm-new-password"
        )
          .clear()
          .type(
            temporaryPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.intercept(
          "POST",
          "**/api/auth/recovery/reset"
        ).as(
          "wrongRecovery"
        );

        cy.contains(
          "button",
          "Reset password"
        )
          .should(
            "be.enabled"
          )
          .click();

        cy.wait(
          "@wrongRecovery",
          {
            timeout:
              30000,
          }
        ).then(
          interception => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception
                .response
                .statusCode
            ).to.eq(
              401
            );

            expect(
              interception
                .response
                .body
                ?.message
            ).to.eq(
              "Recovery answer did not match."
            );
          }
        );

        cy.contains(
          '[role="alert"]',
          "Recovery answer did not match."
        ).should(
          "be.visible"
        );

        /* =============================================
           CORRECT ANSWER MUST RESET PASSWORD
        ============================================= */

        cy.get(
          "#recovery-answer"
        )
          .clear()
          .type(
            recoveryAnswer,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.intercept(
          "POST",
          "**/api/auth/recovery/reset"
        ).as(
          "correctRecovery"
        );

        cy.contains(
          "button",
          "Reset password"
        )
          .should(
            "be.enabled"
          )
          .click();

        cy.wait(
          "@correctRecovery",
          {
            timeout:
              30000,
          }
        ).then(
          interception => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception
                .response
                .statusCode
            ).to.eq(
              200
            );

            expect(
              interception
                .response
                .body
                ?.success
            ).to.eq(
              true
            );
          }
        );

        cy.contains(
          /Password reset successful/i,
          {
            timeout:
              15000,
          }
        ).should(
          "be.visible"
        );

        cy.location(
          "pathname",
          {
            timeout:
              10000,
          }
        ).should(
          "eq",
          "/login"
        );

        /* =============================================
           OLD PASSWORD MUST NOW FAIL
        ============================================= */

        cy.get(
          "#login-anonymous-id"
        )
          .clear()
          .type(
            userId,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#login-password"
        )
          .clear()
          .type(
            originalPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.contains(
          "button",
          "Sign in"
        ).click();

        cy.contains(
          '[role="alert"]',
          "Invalid Anonymous ID or password.",
          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        cy.location(
          "pathname"
        ).should(
          "eq",
          "/login"
        );

        /* =============================================
           TEMPORARY NEW PASSWORD MUST WORK
        ============================================= */

        cy.get(
          "#login-password"
        )
          .clear()
          .type(
            temporaryPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.contains(
          "button",
          "Sign in"
        )
          .should(
            "be.enabled"
          )
          .click();

        cy.location(
          "pathname",
          {
            timeout:
              20000,
          }
        ).should(
          "eq",
          "/user/dashboard"
        );

        cy.get(
          '[aria-label="Dashboard sidebar"]',
          {
            timeout:
              15000,
          }
        ).should(
          "be.visible"
        );

        /* =============================================
           LOGOUT BEFORE RESTORING ORIGINAL PASSWORD
        ============================================= */

        cy.logoutInnerVoice();

        /* =============================================
           RESTORE ORIGINAL TEST PASSWORD
        ============================================= */

        cy.visit(
          "/forgot-password"
        );

        cy.get(
          "#forgot-anonymous-id"
        )
          .clear()
          .type(
            userId,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.intercept(
          "POST",
          "**/api/auth/recovery/question"
        ).as(
          "loadQuestionAgain"
        );

        cy.contains(
          "button",
          "Show my recovery question"
        ).click();

        cy.wait(
          "@loadQuestionAgain",
          {
            timeout:
              30000,
          }
        )
          .its(
            "response.statusCode"
          )
          .should(
            "eq",
            200
          );

        cy.get(
          "#recovery-answer"
        )
          .clear()
          .type(
            recoveryAnswer,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#new-password"
        )
          .clear()
          .type(
            originalPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#confirm-new-password"
        )
          .clear()
          .type(
            originalPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.intercept(
          "POST",
          "**/api/auth/recovery/reset"
        ).as(
          "restoreOriginalPassword"
        );

        cy.contains(
          "button",
          "Reset password"
        )
          .should(
            "be.enabled"
          )
          .click();

        cy.wait(
          "@restoreOriginalPassword",
          {
            timeout:
              30000,
          }
        ).then(
          interception => {
            expect(
              interception.response
            ).to.exist;

            expect(
              interception
                .response
                .statusCode
            ).to.eq(
              200
            );
          }
        );

        cy.location(
          "pathname",
          {
            timeout:
              10000,
          }
        ).should(
          "eq",
          "/login"
        );

        /* =============================================
           FINAL CONFIRMATION:
           ORIGINAL PASSWORD WORKS AGAIN
        ============================================= */

        cy.get(
          "#login-anonymous-id"
        )
          .clear()
          .type(
            userId,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.get(
          "#login-password"
        )
          .clear()
          .type(
            originalPassword,
            {
              log: false,
              parseSpecialCharSequences:
                false,
            }
          );

        cy.contains(
          "button",
          "Sign in"
        ).click();

        cy.location(
          "pathname",
          {
            timeout:
              20000,
          }
        ).should(
          "eq",
          "/user/dashboard"
        );

        cy.get(
          '[aria-label="Dashboard sidebar"]',
          {
            timeout:
              15000,
          }
        ).should(
          "be.visible"
        );

        cy.logoutInnerVoice();
      }
    );
  });
});