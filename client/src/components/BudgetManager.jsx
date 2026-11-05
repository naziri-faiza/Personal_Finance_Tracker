import { useState, useMemo } from "react";
import {
  Wallet,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  X,
} from "lucide-react";

const STANDARD_CATEGORIES = [
  "Food & Dining",
  "Housing & Rent",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Travel",
  "Personal Care",
  "General Expenses",
];

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

export function BudgetManager({
  budgets = [],
  transactions = [],
  selectedMonth,
  onMonthChange,
  onSaveBudget,
  onDeleteBudget,
  loading = false,
  availableCategories = [],
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formCategory, setFormCategory] = useState("");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMonth, setFormMonth] = useState(selectedMonth);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Categories list for select
  const categoryOptions = useMemo(() => {
    const set = new Set([...STANDARD_CATEGORIES, ...availableCategories]);
    return Array.from(set).sort();
  }, [availableCategories]);

  // Compute spent amount per category for the selected month
  const budgetsWithSpending = useMemo(() => {
    // Filter budgets for the active month
    const monthBudgets = budgets.filter((b) => b.month === selectedMonth);

    // Filter transactions for this month and expense type
    const monthExpenses = transactions.filter((tx) => {
      if (tx.type !== "expense" || !tx.date) return false;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return false;
      const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return txMonth === selectedMonth;
    });

    return monthBudgets.map((b) => {
      const spent = monthExpenses
        .filter((tx) => String(tx.category || "").trim().toLowerCase() === String(b.category || "").trim().toLowerCase())
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      const limit = Number(b.amount || 0);
      const remaining = limit - spent;
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      let status = "normal"; // < 80%
      if (percentage >= 100) {
        status = "exceeded"; // > 100%
      } else if (percentage >= 80) {
        status = "warning"; // 80 - 100%
      }

      return {
        ...b,
        limit,
        spent,
        remaining,
        percentage,
        status,
      };
    });
  }, [budgets, transactions, selectedMonth]);

  // Global summary of budgets this month
  const totalBudgeted = budgetsWithSpending.reduce((sum, b) => sum + b.limit, 0);
  const totalSpentInBudgets = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0);

  // Identify warning/exceeded budgets for quick alert
  const exceededBudgets = budgetsWithSpending.filter((b) => b.status === "exceeded");
  const warningBudgets = budgetsWithSpending.filter((b) => b.status === "warning");

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormCategory(categoryOptions[0] || "Food & Dining");
    setFormCustomCategory("");
    setFormAmount("");
    setFormMonth(selectedMonth);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    if (categoryOptions.includes(budget.category)) {
      setFormCategory(budget.category);
      setFormCustomCategory("");
    } else {
      setFormCategory("other");
      setFormCustomCategory(budget.category);
    }
    setFormAmount(String(budget.amount));
    setFormMonth(budget.month);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const finalCategory =
      formCategory === "other"
        ? formCustomCategory.trim()
        : formCategory.trim();

    if (!finalCategory) {
      setFormError("Please select or enter a category");
      return;
    }

    const numAmount = Number(formAmount);
    if (!numAmount || numAmount <= 0) {
      setFormError("Please enter a valid budget amount greater than 0");
      return;
    }

    if (!/^\d{4}-\d{2}$/.test(formMonth)) {
      setFormError("Month must be in YYYY-MM format");
      return;
    }

    setSubmitting(true);
    try {
      await onSaveBudget({
        id: editingBudget?._id,
        category: finalCategory,
        amount: numAmount,
        month: formMonth,
      });
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Failed to save budget");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, category) => {
    const confirm = window.confirm(`Delete monthly budget for "${category}"?`);
    if (!confirm) return;
    try {
      await onDeleteBudget(id);
    } catch (err) {
      alert(err.message || "Failed to delete budget");
    }
  };

  return (
    <div className="space-y-6">
      {/* Month Selector & Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Monthly Budgets</h3>
          <p className="mt-1 text-sm text-slate-400">
            Set and track spending limits by category for {selectedMonth}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => e.target.value && onMonthChange(e.target.value)}
              className="bg-transparent text-white outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-emerald-300"
          >
            <Plus size={16} />
            Set Budget
          </button>
        </div>
      </div>

      {/* Warning Alert Banners */}
      {exceededBudgets.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
          <AlertCircle className="mt-0.5 shrink-0 text-rose-400" size={20} />
          <div className="text-xs">
            <strong className="block text-sm font-semibold text-rose-300">
              Budget Alert: {exceededBudgets.length} Category Exceeded Limit!
            </strong>
            <p className="mt-1">
              You have exceeded your spending limit in:{" "}
              {exceededBudgets.map((b) => (
                <span key={b._id} className="font-semibold underline mr-2">
                  {b.category} (+{money(b.spent - b.limit)} over)
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {warningBudgets.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <AlertTriangle className="mt-0.5 shrink-0 text-amber-400" size={20} />
          <div className="text-xs">
            <strong className="block text-sm font-semibold text-amber-300">
              Budget Warning: {warningBudgets.length} Category Nearly Exhausted
            </strong>
            <p className="mt-1">
              Approaching 100% capacity in:{" "}
              {warningBudgets.map((b) => (
                <span key={b._id} className="font-semibold mr-2">
                  {b.category} ({b.percentage.toFixed(0)}% used)
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#111114] p-4">
          <p className="text-xs text-slate-400">Total Monthly Budget</p>
          <p className="mt-2 text-2xl font-bold text-white">{money(totalBudgeted)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Across {budgetsWithSpending.length} categories
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111114] p-4">
          <p className="text-xs text-slate-400">Total Spent in Budgeted</p>
          <p className="mt-2 text-2xl font-bold text-rose-400">{money(totalSpentInBudgets)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {totalBudgeted > 0
              ? `${Math.round((totalSpentInBudgets / totalBudgeted) * 100)}% of total budget`
              : "0%"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111114] p-4">
          <p className="text-xs text-slate-400">Remaining Budget</p>
          <p
            className={`mt-2 text-2xl font-bold ${
              totalBudgeted - totalSpentInBudgets >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {money(Math.max(0, totalBudgeted - totalSpentInBudgets))}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalBudgeted - totalSpentInBudgets < 0
              ? `Overall over budget by ${money(totalSpentInBudgets - totalBudgeted)}`
              : "Available spending cushion"}
          </p>
        </div>
      </div>

      {/* Budgets List */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#111114] p-8 text-center text-sm text-slate-400">
          Loading budgets...
        </div>
      ) : budgetsWithSpending.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#111114] p-8 text-center">
          <Wallet className="mb-3 text-slate-500" size={36} />
          <h4 className="text-sm font-semibold text-white">No Budgets Set For {selectedMonth}</h4>
          <p className="mt-1 max-w-sm text-xs text-slate-400">
            Setting category budgets helps keep your spending under control and triggers smart alerts when limits are near.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-300"
          >
            <Plus size={15} />
            Create First Budget
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgetsWithSpending.map((item) => {
            const isExceeded = item.status === "exceeded";
            const isWarning = item.status === "warning";

            let barColor = "bg-emerald-400";
            let badgeBg = "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
            let statusText = "On Track";
            let StatusIcon = CheckCircle2;

            if (isExceeded) {
              barColor = "bg-rose-500";
              badgeBg = "bg-rose-500/15 text-rose-300 border-rose-500/30";
              statusText = "Exceeded";
              StatusIcon = AlertCircle;
            } else if (isWarning) {
              barColor = "bg-amber-400";
              badgeBg = "bg-amber-400/15 text-amber-300 border-amber-400/30";
              statusText = "Nearly Exhausted";
              StatusIcon = AlertTriangle;
            }

            return (
              <div
                key={item._id}
                className={`rounded-2xl border p-5 transition ${
                  isExceeded
                    ? "border-rose-500/30 bg-[#141013]"
                    : isWarning
                    ? "border-amber-500/30 bg-[#14120e]"
                    : "border-white/10 bg-[#111114]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-white text-sm">{item.category}</h4>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Limit: <strong className="text-slate-200">{money(item.limit)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badgeBg}`}
                    >
                      <StatusIcon size={12} />
                      {statusText}
                    </span>

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                      title="Edit Budget"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item._id, item.category)}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-400 hover:bg-rose-500/15"
                      title="Delete Budget"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Spent & Remaining Details */}
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#09090b] p-3 text-xs">
                  <div>
                    <span className="text-slate-400">Spent:</span>
                    <p className="mt-1 font-semibold text-rose-400">{money(item.spent)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">
                      {isExceeded ? "Over by:" : "Remaining:"}
                    </span>
                    <p
                      className={`mt-1 font-semibold ${
                        isExceeded ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {money(Math.abs(item.remaining))}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Utilization</span>
                    <span className={`font-semibold ${isExceeded ? "text-rose-400" : isWarning ? "text-amber-400" : "text-slate-300"}`}>
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, item.percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111114] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {editingBudget ? "Update Budget Limit" : "Set Category Budget"}
                </h3>
                <p className="text-xs text-slate-400">
                  Target month: <span className="text-emerald-400">{formMonth}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Select */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  disabled={Boolean(editingBudget)}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400 disabled:opacity-60"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="other">Custom / Other category</option>
                </select>
              </div>

              {/* Custom Category Input if 'other' */}
              {formCategory === "other" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Custom Category Name
                  </label>
                  <input
                    type="text"
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    placeholder="e.g. Subscriptions, Gym, Hobbies..."
                    className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              )}

              {/* Monthly Spending Limit */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Monthly Limit (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Target Month */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Target Month (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {formError && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-60"
                >
                  {submitting
                    ? "Saving..."
                    : editingBudget
                    ? "Save Changes"
                    : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
