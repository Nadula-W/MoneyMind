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
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function ExpenseTracker({ dailyBudget, income }: { dailyBudget: number; income: number }) {

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [input, setInput] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [advice, setAdvice] = useState("");
  const [monthlyAdvice, setMonthlyAdvice] = useState("");
  
  // 🗓️ MONTH SELECTOR FOR CHARTS
  const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [mounted, setMounted] = useState(false);

  // 🔍 FILTERS
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
    // mark as mounted to avoid hydration mismatches for DOM-measuring libs
    setMounted(true);
  }, []);

  // 🧠 GET PREDICTIONS WHEN DATE CHANGES
  useEffect(() => {
    if (date) {
      getPredictionForDate();
    }
  }, [date]);

  // 🧠 GET MONTHLY PREDICTIONS WHEN VIEWED MONTH CHANGES
  useEffect(() => {
    if (expenses.length > 0) {
      getPredictionForMonth();
    }
  }, [viewMonth, viewYear, expenses]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) {
        console.error("Failed to fetch expenses:", res.status);
        setExpenses([]);
        return;
      }
      const data = await res.json();
      // Ensure we have an array
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setExpenses([]);
    }
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

      if (!res.ok) {
        console.error("Failed to fetch prediction:", res.status);
        return;
      }

      const data = await res.json();
      setAdvice(data.decision || "");
    } catch (error) {
      console.error("Error fetching prediction:", error);
    }
  };

  // 📊 GET PREDICTION FOR VIEWED MONTH
  const getPredictionForMonth = async () => {
    // Calculate spent amount for viewed month
    const monthSpent = expenses
      .filter((e) => {
        const d = new Date(e.createdAt);
        return (
          d.getMonth() === viewMonth &&
          d.getFullYear() === viewYear
        );
      })
      .reduce((s, e) => s + e.amount, 0);

    const monthlyBudget = dailyBudget * 30; // Approximate monthly budget

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          text: "Monthly spending analysis for budget tracking",
          budget: monthlyBudget,
          spent: monthSpent,
          date: new Date(viewYear, viewMonth).toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        console.error("Failed to fetch monthly prediction:", res.status);
        return;
      }

      const data = await res.json();
      setMonthlyAdvice(data.decision || "");
    } catch (error) {
      console.error("Error fetching monthly prediction:", error);
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

  const monthlySavings = income - monthlyExpenses;

  const monthlySavingsBreakdown = Object.entries(
    expenses.reduce<Record<string, { year: number; month: number; spent: number }>>((acc, expense) => {
      const d = new Date(expense.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;

      if (!acc[key]) {
        acc[key] = { year: d.getFullYear(), month: d.getMonth(), spent: 0 };
      }

      acc[key].spent += expense.amount;
      return acc;
    }, {})
  )
    .map(([key, entry]) => ({
      key,
      label: `${monthNames[entry.month]} ${entry.year}`,
      spent: entry.spent,
      saved: income - entry.spent,
    }))
    .sort((a, b) => (a.label > b.label ? 1 : -1));

  const totalSaved = monthlySavingsBreakdown.reduce((sum, item) => sum + item.saved, 0);

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

      if (!res.ok) {
        console.error("Failed to analyze expense:", res.status);
        return;
      }

      const data = await res.json();
      setAdvice(data.decision || "Unable to generate advice");

      if (data.analysis) {
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
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      setAdvice("Error processing expense");
    }
  };

  // ✏️ EDIT
  const startEdit = (exp: Expense) => {
    setEditingId(exp._id);
    setEditValue(exp.item);
  };

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ id, item: editValue }),
      });

      if (!res.ok) {
        console.error("Failed to save edit:", res.status);
        return;
      }

      setEditingId(null);
      fetchExpenses();
    } catch (error) {
      console.error("Error saving edit:", error);
    }
  };

  // ❌ DELETE
  const deleteExpense = async (id: string) => {
    try {
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        console.error("Failed to delete expense:", res.status);
        return;
      }

      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
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

  const currentDisplayMonth = `${monthNames[viewMonth]} ${viewYear}`;

  // 🔍 GET UNIQUE CATEGORIES FOR FILTER
  const uniqueCategories = Array.from(new Set(expenses.map((e) => e.category)));

  // 🔍 APPLY FILTERS TO EXPENSES
  const filteredExpenses = expenses.filter((exp) => {
    // Month filter
    if (filterMonth !== null) {
      const expMonth = new Date(exp.createdAt).getMonth();
      if (expMonth !== filterMonth) return false;
    }

    // Category filter
    if (filterCategory !== null && filterCategory !== "") {
      if (exp.category !== filterCategory) return false;
    }

    return true;
  });

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

      {/* SAVINGS OVERVIEW */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Savings Overview</h3>
            <p className="text-sm text-gray-500">Based on your entered income and recorded expenses</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded border border-gray-100 p-3">
            <p className="text-sm text-gray-600">Saved This Month</p>
            <p className={`text-xl font-bold ${monthlySavings < 0 ? "text-red-500" : "text-green-600"}`}>
              Rs {monthlySavings.toFixed(2)}
            </p>
          </div>

          <div className="rounded border border-gray-100 p-3">
            <p className="text-sm text-gray-600">Saved So Far</p>
            <p className={`text-xl font-bold ${totalSaved < 0 ? "text-red-500" : "text-green-600"}`}>
              Rs {totalSaved.toFixed(2)}
            </p>
          </div>
        </div>

        {monthlySavingsBreakdown.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Saved by month</p>
            <div className="space-y-2">
              {monthlySavingsBreakdown.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <span className={`text-sm font-semibold ${item.saved < 0 ? "text-red-500" : "text-green-600"}`}>
                    Rs {item.saved.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        {/* FILTER SECTION */}
        <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Filter by Month
            </label>
            <select
              value={filterMonth ?? ""}
              onChange={(e) => setFilterMonth(e.target.value === "" ? null : parseInt(e.target.value))}
              className="w-full border p-2 rounded"
            >
              <option value="">All Months</option>
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Filter by Category
            </label>
            <select
              value={filterCategory ?? ""}
              onChange={(e) => setFilterCategory(e.target.value === "" ? null : e.target.value)}
              className="w-full border p-2 rounded"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterMonth(null);
              setFilterCategory(null);
            }}
            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
          >
            Clear Filters
          </button>
        </div>

        <div className="p-2 text-sm text-gray-600 bg-gray-50 border-b">
          Showing {filteredExpenses.length} of {expenses.length} expenses
        </div>

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
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No expenses found matching the filters
                </td>
              </tr>
            ) : (
              filteredExpenses
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
              ))
            )}
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

          {monthlyAdvice && (
            <div className="mt-4 bg-blue-100 p-3 rounded">
              <p className="text-sm font-semibold text-gray-700">Monthly Insight:</p>
              <p className="text-gray-800">{monthlyAdvice}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        <div className="bg-white p-4 rounded shadow">
          <h3>Category</h3>
          {mounted ? (
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
          ) : (
            <div style={{ height: 300 }} />
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3>Trend</h3>
          {mounted ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lineData}>
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <CartesianGrid stroke="#ccc" />
                <Line dataKey="amount" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 300 }} />
          )}
        </div>

      </div>

    </div>
  );
}