"use client";
import { useState } from "react";
import ExpenseTracker from "../components/ExpenseTracker";

export default function Home() {
  const [goal, setGoal] = useState(260000);
  const [months, setMonths] = useState(14);
  const [income, setIncome] = useState(35000);

  const [dailyBudget, setDailyBudget] = useState(0);

  const calculatePlan = async () => {
    const monthlySaving = goal / months;
    const remaining = income - monthlySaving;
    const daily = remaining / 30;

    setDailyBudget(daily);

    // Save plan to DB
    await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal,
        months,
        predictedIncome: income,
      }),
    });
  };

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

        <button
          onClick={calculatePlan}
          className="w-full bg-black text-white py-2 rounded"
        >
          Calculate Plan
        </button>

        {dailyBudget > 0 && (
          <p className="text-green-600 font-medium">
            Daily Budget: Rs {dailyBudget.toFixed(2)}
          </p>
        )}
      </div>

      {/* DASHBOARD */}
      <ExpenseTracker dailyBudget={dailyBudget} />

    </div>
  );
}