describe(
  "InnerVoice — Dynamic Parent Guidance",

  () => {
    const backendBaseUrl =
      "https://api.innervoice.salehaimtiaz.com/api";

    it(
      "loads dynamic parent guidance with focused warning-sign evidence",

      () => {
        cy.viewport(
          1440,
          900
        );

        /* =================================================
           DIRECT API VERIFICATION

           Do NOT depend on cy.intercept() here.

           The previous failure:
             expected undefined to exist

           happened because Cypress received an intercepted
           request whose response object was unavailable.

           Direct cy.request() gives us a deterministic
           production API check.
        ================================================= */

        cy.request({
          method:
            "GET",

          url:
            `${backendBaseUrl}/guidelines`,

          failOnStatusCode:
            false,
        }).then(
          response => {
            expect(
              response.status
            ).to.eq(
              200
            );

            expect(
              response.body
                ?.success
            ).to.eq(
              true
            );

            expect(
              response.body
                ?.guidelines
            )
              .to.be.an(
                "array"
              )
              .and.have.length(
                5
              );

            expect(
              response.body
                ?.sources
            ).to.be.an(
              "array"
            );

            expect(
              response.body
                .sources
                .length
            ).to.be.gte(
              5
            );

            expect(
              response.body
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
           LOGIN
        ================================================= */

        cy.loginAsParent();

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
           DYNAMIC DASHBOARD EVIDENCE
        ================================================= */

        cy.contains(
          /Source-backed guidance loaded from Firestore/i,

          {
            timeout:
              20000,
          }
        ).should(
          "be.visible"
        );

        cy.contains(
          /Current Evidence Snapshot/i
        ).should(
          "be.visible"
        );

        cy.contains(
          "Where this guidance comes from"
        ).should(
          "be.visible"
        );

        /* =================================================
           GUIDELINES PAGE
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

        /* =================================================
           CLEAN USER-FACING REVIEW INFO

           Developer-style metadata must not be displayed.
        ================================================= */

        cy.contains(
          /Last reviewed/i
        ).should(
          "be.visible"
        );

        cy.contains(
          "DATA SOURCE"
        ).should(
          "not.exist"
        );

        cy.contains(
          "CONTENT VERSION"
        ).should(
          "not.exist"
        );

        cy.contains(
          "SOURCES FOR THIS AGE"
        ).should(
          "not.exist"
        );

        /* =================================================
           AGE GUIDANCE SOURCES
        ================================================= */

        cy.contains(
          "h2",
          "Sources for this age guidance"
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

        /* =================================================
           REVIEW INFO
        ================================================= */

        cy.contains(
          /Last reviewed/i
        ).should(
          "be.visible"
        );

        /* =================================================
           WARNING CONTENT
        ================================================= */

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

        /* =================================================
           WARNING-SPECIFIC EVIDENCE
        ================================================= */

        cy.contains(
          "h2",
          "Evidence related to these warning signs"
        ).should(
          "be.visible"
        );

        /*
         * General parenting resources belong on the
         * Guidelines page, not the warning-evidence area.
         */

        cy.contains(
          "Positive Parenting Tips"
        ).should(
          "not.exist"
        );

        cy.contains(
          "Essentials for Parenting Teens"
        ).should(
          "not.exist"
        );

        /*
         * Mental-health / safety / clinical evidence
         * must remain visible.
         */

        cy.contains(
          "About Children's Mental Health"
        ).should(
          "be.visible"
        );

        cy.contains(
          "WHO"
        ).should(
          "be.visible"
        );

        cy.contains(
          /clinical guideline|clinical handbook/i
        ).should(
          "be.visible"
        );

        /* =================================================
           EXTERNAL EVIDENCE LINKS
        ================================================= */

        cy.contains(
          "a",
          "Open evidence source →"
        ).should(
          "be.visible"
        );

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