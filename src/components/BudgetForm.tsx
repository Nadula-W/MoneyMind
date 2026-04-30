"use client";
import { useState, useEffect } from "react";

export default function BudgetForm({ onBudgetCalculated }: any) {
  const [income, setIncome] = useState("");
  const [goal, setGoal] = useState("");
  const [months, setMonths] = useState("");

  // 🔄 LOAD SAVED PLAN
  useEffect(() => {
    const loadPlan = async () => {
      const res = await fetch("/api/plan");
      const data = await res.json();

      if (data) {
        setIncome(data.income || "");
        setGoal(data.goal || "");
        setMonths(data.months || "");

        if (data.dailyBudget) {
          onBudgetCalculated(data.dailyBudget);
        }
      }
    };

    loadPlan();
  }, []);

  // 🧮 CALCULATE + SAVE
  const calculateBudget = async () => {
    const incomeNum = parseFloat(income);
    const goalNum = parseFloat(goal);
    const monthsNum = parseFloat(months);

    if (!incomeNum || !goalNum || !monthsNum) return;

    const totalIncome = incomeNum * monthsNum;
    const totalDays = monthsNum * 30;

    const remaining = totalIncome - goalNum;

    if (remaining < 0) {
      alert("⚠️ Your goal is too high for your income!");
      return;
    }

    const daily = remaining / totalDays;


    onBudgetCalculated(daily);

    // 💾 SAVE TO DB
    await fetch("/api/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        income: incomeNum,
        goal: goalNum,
        months: monthsNum,
        dailyBudget: daily,
      }),
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Set Financial Plan</h2>

      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          placeholder="Income"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          className="p-2 border rounded-lg"
        />

        <input
          type="number"
          placeholder="Goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="p-2 border rounded-lg"
        />

        <input
          type="number"
          placeholder="Months"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="p-2 border rounded-lg"
        />
      </div>

      <button
        onClick={calculateBudget}
        className="mt-4 w-full bg-black text-white py-2 rounded-lg"
      >
        Calculate Plan
      </button>
    </div>
  );
}