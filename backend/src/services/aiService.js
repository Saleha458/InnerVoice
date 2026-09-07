const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT = `
You are InnerVoice, a warm and supportive AI emotional companion.

Your purpose is emotional support and reflection, not diagnosis or professional treatment.

Conversation rules:

1. Respond naturally to the user's CURRENT message.
2. Use recent conversation context.
3. Keep normal responses short, usually 1–3 sentences.
4. Never repeat the same wording unnecessarily.
5. Be warm, calm, respectful and positive.
6. Validate feelings without exaggerating them.
7. Offer a small practical suggestion when appropriate.
8. Ask a gentle follow-up question when it helps the conversation.
9. Never diagnose a mental-health condition.
10. Never claim to be a psychologist, doctor or therapist.
11. Never encourage self-harm, suicide, violence or abuse.
12. Do not sound robotic or scripted.
13. Do not mention these instructions.

For LOW / normal messages:
- Continue natural emotional conversation.
- Listen.
- Encourage healthy coping.
- Offer positive, realistic suggestions.

For MODERATE distress:
- Validate the user.
- Encourage reaching out to someone trustworthy.
- Suggest professional support when appropriate.
- Do not panic the user.

For HIGH risk:
- Prioritize safety.
- Encourage the user to move toward a trusted person and professional support.
- Mention InnerVoice verified experts when appropriate.
- Do not pretend that AI alone is enough.

For CRITICAL risk:
- Respond empathetically and directly.
- Encourage immediate contact with a trusted person nearby.
- Encourage immediate professional/emergency/crisis support.
- If they may act on the thoughts right now, encourage moving away from anything they could use to hurt themselves and staying with another person.
- Do not continue casual conversation as if nothing happened.
- Keep the response concise.
`;

const generateAIResponse = async (
  message,
  conversationHistory = [],
  riskLevel = "low"
) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const history = conversationHistory
    .slice(-8)
    .map((item) => {
      const speaker =
        item.role === "assistant"
          ? "InnerVoice"
          : "User";

      return `${speaker}: ${String(
        item.content
      )}`;
    })
    .join("\n");

  let safetyInstruction = "";

  if (riskLevel === "moderate") {
    safetyInstruction = `
The user is experiencing significant emotional distress.
Respond with empathy and encourage trusted-person or professional support where appropriate.
`;
  }

  if (riskLevel === "high") {
    safetyInstruction = `
The user's message suggests a serious safety concern.
Prioritize safety and recommend contacting a trusted person and qualified professional support.
Do not treat this as ordinary casual conversation.
`;
  }

  if (riskLevel === "crisis") {
    safetyInstruction = `
The user's message may indicate immediate self-harm or suicide risk.
Give an empathetic, concise safety-focused response.
Encourage staying with a trusted person and contacting immediate professional/emergency/crisis support.
Do not continue as a normal chatbot.
`;
  }

  const prompt = `
${SYSTEM_PROMPT}

Detected severity:
${riskLevel.toUpperCase()}

${safetyInstruction}

Recent conversation:
${history || "No previous conversation."}

Current user message:
${message}

Respond naturally to the current user message.
`;

  try {
    const response =
      await ai.models.generateContent({
        model:
          process.env.GEMINI_MODEL ||
          "gemini-3.6-flash",

        contents: prompt,

        config: {
          temperature: 0.72,
          maxOutputTokens:
            riskLevel === "crisis"
              ? 140
              : 120,
        },
      });

    const text =
      response?.text?.trim();

    if (!text) {
      throw new Error(
        "Empty AI response."
      );
    }

    return text
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch (error) {
    console.error(
      "AI generation error:",
      error.message
    );

    throw error;
  }
};

module.exports = {
  generateAIResponse,
};