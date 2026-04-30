import { StateGraph, Annotation } from "@langchain/langgraph";
import { analyzeExpense } from "./ai";
import { getDecision } from "./decision";
import clientPromise from "./mongodb";

// 🧠 STATE
const AgentState = Annotation.Root({
  input: Annotation<string>(),
  dailyBudget: Annotation<number>(),
  totalSpent: Annotation<number>(),

  analysis: Annotation<any>(),
  memory: Annotation<any>(),
  pattern: Annotation<string>(),
  prediction: Annotation<string>(),
  goalStatus: Annotation<string>(),
  decision: Annotation<string>(),
  selectedDate: Annotation<string>(),
});


// 🚀 GRAPH
const graph = new StateGraph(AgentState)

  // 🟢 ANALYZE NODE
  .addNode("analyzeNode", async (state) => {
    try {
      const result = await analyzeExpense(state.input);
      const clean = result.replace(/```json|```/g, "").trim();

      return {
        analysis: JSON.parse(clean),
      };
    } catch (error) {
      console.error("Analyze Error:", error);
      // ✅ RE-THROW so route handler knows agent failed
      throw new Error("Analyze node failed: " + String(error));
    }
  })


  // 🟢 MEMORY NODE (MongoDB)
  .addNode("memoryNode", async () => {
    try {
      const client = await clientPromise;
      const db = client.db("moneymind");

      const expenses = await db.collection("expenses").find({}).toArray();

      const totalExpenses = expenses.reduce(
        (sum: number, e: any) => sum + e.amount,
        0
      );

      const foodSpending = expenses
        .filter((e: any) => e.category === "food")
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      const transportSpending = expenses
        .filter((e: any) => e.category === "transport")
        .reduce((sum: number, e: any) => sum + e.amount, 0);

      return {
        memory: {
          expenses,
          totalExpenses,
          foodSpending,
          transportSpending,
        },
      };

    } catch (error) {
      console.error("Memory Error:", error);

      return {
        memory: {
          expenses: [],
          totalExpenses: 0,
          foodSpending: 0,
          transportSpending: 0,
        },
      };
    }
  })


  // 🟣 PATTERN NODE
  .addNode("patternNode", async (state) => {
    try {
      const total = state.memory.totalExpenses || 1;

      const foodPercent = Math.round(
        (state.memory.foodSpending / total) * 100
      );

      let pattern =
        foodPercent > 50
          ? `🍔 ${foodPercent}% spent on food`
          : "✅ Spending is balanced";

      return { pattern };

    } catch {
      return { pattern: "⚠️ Pattern unavailable" };
    }
  })


  // 🔮 PREDICTION NODE (DATE-AWARE)
  .addNode("predictionNode", async (state) => {
    try {
      const expenses = state.memory.expenses;

      if (!expenses.length) {
        return { prediction: "📊 Not enough data yet." };
      }

      const dailyMap: Record<string, number> = {};

      expenses.forEach((e: any) => {
        const date = new Date(e.createdAt).toISOString().split("T")[0];
        dailyMap[date] = (dailyMap[date] || 0) + e.amount;
      });

      const days = Object.keys(dailyMap).length;
      const total = Object.values(dailyMap).reduce((a, b) => a + b, 0);

      const avgDaily = total / days;

      let prediction =
        avgDaily > state.dailyBudget
          ? "⚠️ You are overspending daily."
          : avgDaily > state.dailyBudget * 0.8
          ? "⚠️ Spending is close to your limit."
          : "✅ Spending trend is safe.";

      return { prediction };

    } catch {
      return { prediction: "⚠️ Prediction unavailable." };
    }
  })


  // 🎯 GOAL NODE (FULLY UPGRADED)
  .addNode("goalNode", async (state) => {
    try {
      const client = await clientPromise;
      const db = client.db("moneymind");

      const plan = await db.collection("plan").findOne({});

      if (!plan) {
        return { goalStatus: "⚠️ No plan set." };
      }

      const goal = plan.goal || 0;
      const months = plan.months || 1;
      const predictedIncome = plan.predictedIncome || 0;

      const totalExpenses = state.memory.totalExpenses;

      // 🧠 estimate monthly spending
      const avgMonthlySpending = totalExpenses / months;

      // 🧠 required saving per month
      const requiredPerMonth = goal / months;

      // 🧠 current savings ability
      const currentSavings = predictedIncome - avgMonthlySpending;

      let currentStatus =
        currentSavings < requiredPerMonth
          ? "❌ Not saving enough this month"
          : "✅ Good monthly progress";

      // 🧠 future projection
      const predictedTotalSavings =
        (predictedIncome - avgMonthlySpending) * months;

      let futureStatus =
        predictedTotalSavings < goal
          ? "⚠️ You may NOT reach your goal"
          : "🚀 You are on track to reach your goal";

      return {
        goalStatus: `${currentStatus} | ${futureStatus}`,
      };

    } catch (error) {
      console.error("Goal Node Error:", error);

      return {
        goalStatus: "⚠️ Goal calculation failed",
      };
    }
  })


  // 🟢 DECISION NODE
  .addNode("decisionNode", async (state) => {
    try {
      const base = await getDecision({
        dailyBudget: state.dailyBudget,
        totalSpent: state.totalSpent,
        newExpense: state.analysis.amount,
      });

      return {
        decision:
          `${base} | ${state.pattern} | ${state.prediction} | ${state.goalStatus}`,
      };

    } catch {
      return { decision: "⚠️ Decision failed" };
    }
  })


  // 🔗 FLOW
  .addEdge("analyzeNode", "memoryNode")
  .addEdge("memoryNode", "patternNode")
  .addEdge("patternNode", "predictionNode")
  .addEdge("predictionNode", "goalNode")
  .addEdge("goalNode", "decisionNode")

  .setEntryPoint("analyzeNode")
  .setFinishPoint("decisionNode");


// 🚀 EXPORT
export const agent = graph.compile();