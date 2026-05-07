"use client";
import { useState, useEffect } from "react";
import ExpenseTracker from "../components/ExpenseTracker";

export default function Home() {
  const [goal, setGoal] = useState(260000);
  const [months, setMonths] = useState(14);
  const [income, setIncome] = useState(35000);

  const [dailyBudget, setDailyBudget] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // 💾 LOAD SAVED PLAN ON MOUNT
  useEffect(() => {
    const savedPlan = localStorage.getItem("moneyMindPlan");
    if (savedPlan) {
      try {
        const { goal: savedGoal, months: savedMonths, income: savedIncome, dailyBudget: savedBudget } = JSON.parse(savedPlan);
        setGoal(savedGoal);
        setMonths(savedMonths);
        setIncome(savedIncome);
        setDailyBudget(savedBudget);
      } catch (error) {
        console.error("Error loading saved plan:", error);
      }
    }
    setIsLoaded(true);
  }, []);

  const calculatePlan = async () => {
    const monthlySaving = goal / months;
    const remaining = income - monthlySaving;
    const daily = remaining / 30;

    setDailyBudget(daily);

    // 💾 SAVE PLAN TO LOCALSTORAGE
    localStorage.setItem(
      "moneyMindPlan",
      JSON.stringify({
        goal,
        months,
        income,
        dailyBudget: daily,
      })
    );

    // Save plan to DB
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          months,
          predictedIncome: income,
        }),
      });

      if (!res.ok) {
        console.error("Failed to save plan:", res.status);
      }
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  // 🔄 AUTO-CALCULATE WHEN INPUTS CHANGE (if plan was already calculated)
  useEffect(() => {
    if (isLoaded && dailyBudget > 0) {
      // Auto-recalculate when inputs change
      const monthlySaving = goal / months;
      const remaining = income - monthlySaving;
      const daily = remaining / 30;
      setDailyBudget(daily);

      // Save updated plan
      localStorage.setItem(
        "moneyMindPlan",
        JSON.stringify({
          goal,
          months,
          income,
          dailyBudget: daily,
        })
      );
    }
  }, [goal, months, income, isLoaded]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6">

      <h1 className="text-4xl font-bold text-center text-gray-700">
        MoneyMind
      </h1>

      <p className="text-center text-gray-500">
        AI-powered finance assistant
      </p>

      {/* PLAN SECTION */}
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-semibold">
          Set Financial Plan
        </h2>

        <div className="grid md:grid-cols-3 gap-3">
          <input
            type="number"
            value={income}
            onChange={(e) => setIncome(Number(e.target.value))}
            className="border p-2 rounded"
            placeholder="Monthly Income"
          />

          <input
            type="number"
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            className="border p-2 rounded"
            placeholder="Saving Goal"
          />

          <input
            type="number"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="border p-2 rounded"
            placeholder="Months"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={calculatePlan}
            className="flex-1 bg-black text-white py-2 rounded"
          >
            Calculate Plan
          </button>

          {dailyBudget > 0 && (
            <button
              onClick={() => {
                setDailyBudget(0);
                localStorage.removeItem("moneyMindPlan");
              }}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Reset
            </button>
          )}
        </div>

        {dailyBudget > 0 && (
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <p className="text-green-700 font-medium">
              ✅ Daily Budget: Rs {dailyBudget.toFixed(2)}
            </p>
            <p className="text-green-600 text-sm">
              Monthly Target: Rs {(goal / months).toFixed(2)} | Remaining after saving: Rs {((income - (goal / months)) / 30).toFixed(2)} per day
            </p>
          </div>
        )}
      </div>

      {/* DASHBOARD */}
      <ExpenseTracker dailyBudget={dailyBudget} />

    </div>
  );
}