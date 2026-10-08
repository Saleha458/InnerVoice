describe(
  "InnerVoice — Dynamic Parent Guidance",

  () => {
    it(
      "loads source-backed parent guidance, warning signs and provenance",

      () => {
        cy.viewport(
          1440,
          900
        );

        /* =================================================
           LOGIN
        ================================================= */

        cy.loginAsParent();

        /* =================================================
           INTERCEPT DYNAMIC GUIDANCE API
        ================================================= */

        cy.intercept(
          "GET",
          "**/api/guidelines"
        ).as(
          "getGuidelines"
        );

        /* =================================================
           PARENT DASHBOARD
        ================================================= */

        cy.visit(
          "/parent/dashboard"
        );

        cy.location(
          "pathname",

          {
            timeout:
              15000,
          }
        ).should(
          "eq",
          "/parent/dashboard"
        );

        cy.contains(
          "h1",
          "Parent Support Center",

          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        /* =================================================
           VERIFY API RESPONSE
        ================================================= */

        cy.wait(
          "@getGuidelines",

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

            expect(
              interception
                .response
                .body
                ?.guidelines
            ).to.have.length(
              5
            );

            expect(
              interception
                .response
                .body
                ?.sources
                ?.length
            ).to.be.gte(
              5
            );

            expect(
              interception
                .response
                .body
                ?.meta
                ?.contentVersion
            )
              .to.be.a(
                "string"
              )
              .and.not.be
              .empty;

            expect(
              interception
                .response
                .body
                ?.meta
                ?.reviewedAt
            )
              .to.be.a(
                "string"
              )
              .and.not.be
              .empty;
          }
        );

        /* =================================================
           DASHBOARD EVIDENCE UI
        ================================================= */

        cy.contains(
          /Source-backed guidance loaded from Firestore/i,

          {
            timeout:
              15000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "Current Evidence Snapshot",

          {
            matchCase:
              false,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "Where this guidance comes from"
        ).should(
          "be.visible"
        );

        /* =================================================
           GUIDELINES
        ================================================= */

        cy.get(
          '[aria-label="Dashboard navigation"]'
        )
          .contains(
            "Guidelines"
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
          "/parent/guidelines"
        );

        cy.contains(
          "h1",
          "Guidance by Age",

          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "Dynamic Firestore content"
        ).should(
          "be.visible"
        );

        cy.contains(
          "Official sources for this age group"
        ).should(
          "be.visible"
        );

        cy.contains(
          "CDC"
        ).should(
          "be.visible"
        );

        cy.contains(
          "WHO"
        ).should(
          "be.visible"
        );

        /* =================================================
           EARLY TEEN AGE GROUP
        ================================================= */

        cy.contains(
          "button",
          "11–14"
        )
          .should(
            "be.visible"
          )
          .click();

        cy.location(
          "search"
        ).should(
          "include",
          "age=11-14"
        );

        cy.contains(
          "h2",
          "11–14 years"
        ).should(
          "be.visible"
        );

        cy.contains(
          /self-harm|suicide/i
        ).should(
          "be.visible"
        );

        cy.contains(
          "Immediate safety takes priority"
        ).should(
          "be.visible"
        );

        /* =================================================
           WARNING SIGNS PAGE
        ================================================= */

        cy.contains(
          "a",
          /Warning signs for this age/i
        ).click();

        cy.location(
          "pathname",

          {
            timeout:
              15000,
          }
        ).should(
          "eq",
          "/parent/warnings"
        );

        cy.location(
          "search"
        ).should(
          "include",
          "age=11-14"
        );

        cy.contains(
          "h1",
          "Warning Signs",

          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          "Important context"
        ).should(
          "be.visible"
        );

        cy.contains(
          /One warning sign alone does not prove/i
        ).should(
          "be.visible"
        );

        cy.contains(
          "When to seek professional help"
        ).should(
          "be.visible"
        );

        cy.contains(
          "Do not wait for routine support when there is immediate risk"
        ).should(
          "be.visible"
        );

        cy.contains(
          "Official sources for this age group"
        ).should(
          "be.visible"
        );

        /* =================================================
           SOURCE LINKS
        ================================================= */

        cy.get(
          'a[target="_blank"][rel="noreferrer"]'
        ).should(
          "have.length.greaterThan",
          0
        );
      }
    );
  }
);