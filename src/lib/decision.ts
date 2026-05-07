import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export async function getDecision({
  dailyBudget,
  totalSpent,
  newExpense,
}: {
  dailyBudget: number;
  totalSpent: number;
  newExpense: number;
}) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable not set");
  }

  const prompt = `You are a smart financial advisor. Give ONE SHORT sentence (under 15 words) about spending based on this:
- Daily budget: Rs ${dailyBudget}
- Already spent: Rs ${totalSpent}
- New expense: Rs ${newExpense}

Be concise. No numbers. No explanation.`;

  try {
    const message = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText = message.choices[0]?.message?.content || "";
    return responseText.trim();
  } catch (error) {
    console.error("Groq Decision Error:", error);
    // Return default decision on error
    const remaining = dailyBudget - (totalSpent + newExpense);
    if (remaining < 0) {
      return "You have exceeded your daily budget.";
    } else if (remaining < dailyBudget * 0.2) {
      return "You are approaching your daily budget limit.";
    } else {
      return "Your expense has been recorded.";
    }
  }
}