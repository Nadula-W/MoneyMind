"use client";
import { useState, useEffect } from "react";
import {
  PieChart, Pie, Cell,
  LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from "recharts";

type Expense = {
  _id: string;
  item: string;
  category: string;
  amount: number;
  createdAt: string;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function ExpenseTracker({ dailyBudget }: any) {

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [input, setInput] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [advice, setAdvice] = useState("");
  
  // 🗓️ MONTH SELECTOR FOR CHARTS
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    fetchExpenses();
  }, []);

  // 🧠 GET PREDICTIONS WHEN DATE CHANGES
  useEffect(() => {
    if (date) {
      getPredictionForDate();
    }
  }, [date]);

  const fetchExpenses = async () => {
    const res = await fetch("/api/expenses");
    setExpenses(await res.json());
  };

  // 🧠 GET PREDICTION FOR SELECTED DATE
  const getPredictionForDate = async () => {
    const selectedDateObj = new Date(date);
    const selectedDay = selectedDateObj.toISOString().split("T")[0];
    
    // Calculate spent amount for selected date
    const daySpent = expenses
      .filter((e) => {
        const d = new Date(e.createdAt).toISOString().split("T")[0];
        return d === selectedDay;
      })
      .reduce((s, e) => s + e.amount, 0);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          text: "Daily prediction for budget tracking",
          budget: dailyBudget,
          spent: daySpent,
          date: date,
        }),
      });

      const data = await res.json();
      setAdvice(data.decision || "");
    } catch (error) {
      console.error("Error fetching prediction:", error);
    }
  };

  // 🧠 SELECTED DATE
  const selectedDateObj = new Date(date);
  const selectedDay = selectedDateObj.toISOString().split("T")[0];
  const selectedMonth = selectedDateObj.getMonth();
  const selectedYear = selectedDateObj.getFullYear();

  // 📊 TODAY (SELECTED DAY)
  const todaySpent = expenses
    .filter((e) => {
      const d = new Date(e.createdAt).toISOString().split("T")[0];
      return d === selectedDay;
    })
    .reduce((s, e) => s + e.amount, 0);

  const remainingToday = dailyBudget - todaySpent;

  // 📊 MONTHLY (SELECTED MONTH)
  const monthlyExpenses = expenses
    .filter((e) => {
      const d = new Date(e.createdAt);
      return (
        d.getMonth() === selectedMonth &&
        d.getFullYear() === selectedYear
      );
    })
    .reduce((s, e) => s + e.amount, 0);

  const daysPassed = selectedDateObj.getDate();
  const avgDaily = monthlyExpenses / (daysPassed || 1);

  // ➕ ADD EXPENSE
  const addExpense = async () => {
    if (!input) return;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          text: input,
          budget: dailyBudget,
          spent: todaySpent,
          date: date,
        }),
      });

      const data = await res.json();
      setAdvice(data.decision);

      await fetch("/api/expenses", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          ...data.analysis,
          createdAt: new Date(date).toISOString(), // ✅ ISO format with time
        }),
      });

      setInput("");
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  // ✏️ EDIT
  const startEdit = (exp: Expense) => {
    setEditingId(exp._id);
    setEditValue(exp.item);
  };

  const saveEdit = async (id: string) => {
    await fetch("/api/expenses", {
      method: "PUT",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ id, item: editValue }),
    });

    setEditingId(null);
    fetchExpenses();
  };

  // ❌ DELETE
  const deleteExpense = async (id: string) => {
    await fetch("/api/expenses", {
      method: "DELETE",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ id }),
    });

    fetchExpenses();
  };

  // 📊 PIE DATA (FILTERED BY VIEWED MONTH)
  const categoryMap: Record<string, number> = {};

  expenses.forEach((e) => {
    const d = new Date(e.createdAt);

    if (
      d.getMonth() === viewMonth &&
      d.getFullYear() === viewYear
    ) {
      categoryMap[e.category] =
        (categoryMap[e.category] || 0) + e.amount;
    }
  });

  const pieData = Object.keys(categoryMap).map((k) => ({
    name: k,
    value: categoryMap[k],
  }));

  // 📊 GET MONTHLY TOTAL FOR VIEWED MONTH
  const viewedMonthlyExpenses = Object.values(categoryMap).reduce((a, b) => a + b, 0);

  // 📊 LINE DATA (FILTERED BY VIEWED MONTH - DAILY TREND)
  const dailyMap: Record<string, number> = {};

  expenses.forEach((e) => {
    const d = new Date(e.createdAt);

    if (
      d.getMonth() === viewMonth &&
      d.getFullYear() === viewYear
    ) {
      const day = d.getDate();
      dailyMap[day] = (dailyMap[day] || 0) + e.amount;
    }
  });

  const lineData = Object.keys(dailyMap)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((d) => ({
      day: d,
      amount: dailyMap[d],
    }));

  // 🗓️ HELPER FUNCTIONS FOR MONTH NAVIGATION
  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentDisplayMonth = `${monthNames[viewMonth]} ${viewYear}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold text-center">
        Smart Finance Dashboard
      </h1>

      {/* INPUT + DATE */}
      <div className="bg-white p-4 rounded shadow space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 500 kottu"
            className="flex-1 border p-2 rounded"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
          />

          <button
            onClick={addExpense}
            className="bg-blue-500 text-white px-4 rounded"
          >
            Add
          </button>
        </div>

        {advice && (
          <div className="bg-yellow-100 p-2 rounded">
            {advice}
          </div>
        )}
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          Daily Budget <br /> Rs {dailyBudget.toFixed(2)}
        </div>

        <div className="bg-white p-4 rounded shadow">
          Selected Day <br /> Rs {todaySpent.toFixed(2)}
        </div>

        <div className="bg-white p-4 rounded shadow">
          Monthly <br /> Rs {monthlyExpenses.toFixed(2)}
        </div>

        <div className="bg-white p-4 rounded shadow">
          Remaining <br />
          <span className={remainingToday < 0 ? "text-red-500" : "text-green-600"}>
            Rs {remainingToday.toFixed(2)}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2">Item</th>
              <th className="p-2">Category</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Date</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>

          <tbody>
            {expenses
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((exp) => (
              <tr key={exp._id} className="border-t">
                <td className="p-2">
                  {editingId === exp._id ? (
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(exp._id)}
                      className="border p-1"
                    />
                  ) : exp.item}
                </td>

                <td className="p-2">{exp.category}</td>
                <td className="p-2">Rs {exp.amount}</td>
                <td className="p-2">
                  {new Date(exp.createdAt).toLocaleDateString()}
                </td>

                <td className="p-2 space-x-2">
                  <button
                    onClick={() => startEdit(exp)}
                    className="text-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteExpense(exp._id)}
                    className="text-red-500"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CHARTS */}
      <div className="space-y-4">
        {/* MONTH NAVIGATION */}
        <div className="bg-white p-4 rounded shadow flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
          >
            ← Previous
          </button>
          
          <h2 className="text-xl font-bold text-center">{currentDisplayMonth}</h2>
          
          <button
            onClick={goToNextMonth}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
          >
            Next →
          </button>
        </div>

        {/* MONTHLY SUMMARY */}
        <div className="bg-white p-4 rounded shadow">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Monthly Budget</p>
              <p className="text-2xl font-bold">Rs {(dailyBudget * 30).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Spent</p>
              <p className="text-2xl font-bold">Rs {viewedMonthlyExpenses.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Remaining</p>
              <p className={`text-2xl font-bold ${(dailyBudget * 30 - viewedMonthlyExpenses) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                Rs {((dailyBudget * 30) - viewedMonthlyExpenses).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-white p-4 rounded shadow">
          <h3>Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3>Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <CartesianGrid stroke="#ccc" />
              <Line dataKey="amount" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  );
}