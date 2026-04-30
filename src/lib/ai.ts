import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function analyzeExpense(input: string) {
  const prompt = `You MUST respond with ONLY a valid JSON object. No other text.

Extract expense details:
Input: "${input}"

Categories: food, transport, other

RESPOND WITH ONLY THIS JSON FORMAT (no markdown, no explanation):
{"amount": number, "category": "food|transport|other", "item": "name"}`;

  try {
    const message = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.choices[0]?.message?.content || "";
    return responseText;
  } catch (error) {
    console.error("Groq API Error:", error);
    throw new Error("AI service is currently busy. Please try again.");
  }
}