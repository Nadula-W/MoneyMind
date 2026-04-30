import { agent } from "../../../lib/agent";
import { analyzeExpense } from "../../../lib/ai";
import { getDecision } from "../../../lib/decision";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 🧠 INPUT EXTRACTION
    const inputText = body.text;
    const dailyBudget = Number(body.budget || 0);
    const totalSpent = Number(body.spent || 0);
    const selectedDate = body.date; // ✅ NEW (IMPORTANT)

    // 🧠 BASIC VALIDATION
    if (!inputText) {
      return Response.json(
        { error: "Missing input text" },
        { status: 400 }
      );
    }

    // ✅ HELPER FUNCTION TO CLEAN DECISION TEXT
    const cleanDecision = (text: string) => {
      return text
        .replace(/[^\w\s\.,!?\-]/g, "") // Remove emojis and special chars
        .replace(/\s*\|\s*/g, " ") // Remove pipe characters
        .replace(/\s+/g, " ") // Remove extra spaces
        .trim();
    };

    // 🟢 MAIN FLOW — TRY LANGGRAPH AGENT
    try {
      const result = await agent.invoke({
        input: inputText,
        dailyBudget,
        totalSpent,
        selectedDate, // ✅ PASS DATE
      });

      return Response.json({
        analysis: result.analysis || {
          amount: 0,
          category: "other",
          item: inputText,
        },
        decision: cleanDecision(result.decision || "No decision generated"),
        source: "agent",
      });

    } catch (agentError) {
      console.error("⚠️ Agent failed, switching to fallback:", agentError);
    }

    // 🟡 FALLBACK 1 — DIRECT AI (NO GRAPH)
    try {
      const aiResult = await analyzeExpense(inputText);

      let parsed;

      try {
        // Remove markdown code blocks and whitespace
        const clean = aiResult
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        
        // Extract JSON if wrapped in other text
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : clean;
        
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("⚠️ JSON Parse Error:", parseError);
        throw new Error("Invalid AI JSON");
      }

      const decision = await getDecision({
        dailyBudget,
        totalSpent,
        newExpense: parsed.amount || 0,
      });

      return Response.json({
        analysis: {
          amount: parsed.amount || 0,
          category: parsed.category || "other",
          item: parsed.item || inputText,
        },
        decision: cleanDecision(decision + " (AI fallback)"),
        source: "ai",
      });

    } catch (aiError) {
      console.error("⚠️ AI fallback failed:", aiError);
    }

    // 🔴 FALLBACK 2 — MANUAL PARSER (IMPROVED)
    try {
      const text = inputText.toLowerCase();
      const originalText = inputText;

      // 🧠 EXTRACT AMOUNT - Match first number (with decimals)
      const amountMatch = text.match(/(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

      // 🧠 CATEGORY DETECTION (EXPANDED) - Check BEFORE removing amount
      let category = "other";

      const foodKeywords = [
        "food", "kottu", "rice", "lunch", "dinner", "snack", "breakfast",
        "pizza", "burger", "meal", "eat", "eating", "cake", "coffee", "tea",
        "sandwich", "biryani", "noodles", "pasta", "soup", "salad", "drinks"
      ];

      const transportKeywords = [
        "fuel", "bus", "uber", "pickme", "taxi", "transport", "car", "bike",
        "train", "tram", "petrol", "diesel", "gas", "travel", "ride", "fare",
        "autorickshaw", "auto", "three-wheeler"
      ];

      if (foodKeywords.some(keyword => text.includes(keyword))) {
        category = "food";
      } else if (transportKeywords.some(keyword => text.includes(keyword))) {
        category = "transport";
      }

      // 🧠 ITEM EXTRACTION (IMPROVED)
      let item = originalText;
      
      // Remove amount from the text
      if (amountMatch) {
        item = originalText.replace(amountMatch[0], "").trim();
      }
      
      // If still empty or just whitespace/words, clean it up
      if (!item || item.length === 0) {
        item = category === "food" ? "Food" : category === "transport" ? "Transport" : "Expense";
      } else if (item.startsWith("for ") || item.startsWith("For ")) {
        // Clean up "for lunch" to just "lunch"
        item = item.substring(4).trim();
        if (!item) {
          item = category === "food" ? "Food" : category === "transport" ? "Transport" : "Expense";
        }
      }

      // 🧠 TRY TO GET DECISION, WITH FALLBACK
      let decision = "Expense recorded";
      try {
        const decisionResult = await getDecision({
          dailyBudget,
          totalSpent,
          newExpense: amount,
        });
        decision = decisionResult;
      } catch (decisionError) {
        console.error("⚠️ Decision generation failed, using default:", decisionError);
        // Use default decision based on budget
        const remaining = dailyBudget - (totalSpent + amount);
        if (remaining < 0) {
          decision = "You have exceeded your daily budget.";
        } else if (remaining < dailyBudget * 0.2) {
          decision = "You are approaching your daily budget limit. Be careful.";
        } else {
          decision = "Your expense has been recorded.";
        }
      }

      return Response.json({
        analysis: {
          amount,
          category,
          item,
        },
        decision: cleanDecision(decision + " (manual fallback)"),
        source: "manual",
      });

    } catch (manualError) {
      console.error("❌ Manual fallback failed:", manualError);
    }

    // ❌ FINAL SAFETY RETURN (NEVER CRASH UI)
    return Response.json({
      analysis: {
        amount: 0,
        category: "other",
        item: inputText,
      },
      decision: cleanDecision("Unable to process expense"),
      source: "failed",
    });

  } catch (error: any) {
    console.error("🚨 API CRASH:", error);

    return Response.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}