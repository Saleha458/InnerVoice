"use strict";

require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const key = process.env.GEMINI_API_KEY?.trim();

if (!key) {
  console.error("GEMINI_API_KEY is missing from backend/.env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: key });

const candidates = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash"
];

async function main() {
  const available = new Set();

  const pager = await ai.models.list({
    config: { pageSize: 100 }
  });

  for await (const model of pager) {
    if (model.supportedActions?.includes("generateContent")) {
      available.add(
        String(model.name).replace(/^models\//, "")
      );
    }
  }

  console.log("Available Flash models:");

  console.log(
    [...available]
      .filter(name => name.includes("flash"))
      .join("\n") || "(none listed)"
  );

  const choices = candidates.filter(name =>
    available.has(name)
  );

  if (!choices.length) {
    console.log(
      "None of the three free-tier candidates is listed."
    );
    return;
  }

  for (const model of choices) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents:
          "Respond warmly in one sentence to: I am happy.",
        config: {
          maxOutputTokens: 350,
          thinkingConfig: {
            thinkingLevel: "minimal"
          }
        }
      });

      if (!String(response.text || "").trim()) {
        console.log(
          model,
          "returned an empty answer; trying next model."
        );
        continue;
      }

      console.log("WORKING_MODEL=" + model);
      console.log("TEST_REPLY=" + response.text.trim());
      return;
    } catch (error) {
      const status = Number(
        error.status || error.code || 0
      );

      console.log(
        model,
        "failed with status",
        status || error.name
      );

      if ([401, 403, 429].includes(status)) {
        console.log(
          "Stopping tests; do not repeatedly retry."
        );
        return;
      }
    }
  }

  console.log(
    "No tested model generated an answer on this key."
  );
}

main().catch(error => {
  console.error(
    "Model-list failed:",
    error?.status ||
      error?.code ||
      error?.name ||
      "unknown"
  );

  process.exitCode = 1;
});