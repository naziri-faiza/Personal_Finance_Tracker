import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  LogOut,
  X,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { authApi, transactionsApi, budgetsApi } from "./services/api";
import { MonthlyComparisonChart, CategoryDonutChart } from "./components/Charts";
import { TransactionFilters } from "./components/TransactionFilters";
import { BudgetManager } from "./components/BudgetManager";

const TOKEN_KEY = "finora_token";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "No date";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getInitials = (text) => {
  if (!text) return "TR";
  return (
    text
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "TR"
  );
};

const getTodayString = () => new Date().toISOString().slice(0, 10);
const getCurrentMonthString = () => new Date().toISOString().slice(0, 7);

const initialFilters = {
  type: "all",
  category: "all",
  startDate: "",
  endDate: "",
  search: "",
};

const defaultTransactionForm = {
  title: "",
  amount: "",
  type: "expense",
  category: "",
  date: getTodayString(),
  note: "",
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | transactions | budgets | analytics
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());

  // Filter state
  const [filters, setFilters] = useState(initialFilters);

  // Auth state
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Loading states
  const [fetchLoading, setFetchLoading] = useState(false);
  const [budgetsLoading, setBudgetsLoading] = useState(false);
  const [networkError, setNetworkError] = useState("");

  // Transaction form modal
  const [transactionForm, setTransactionForm] = useState(defaultTransactionForm);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);

  // Available unique categories from transactions & standard lists
  const availableCategories = useMemo(() => {
    const set = new Set();
    transactions.forEach((tx) => {
      if (tx.category && tx.category.trim()) {
        set.add(tx.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Client-side instant multi-criteria filtering on real user transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Filter by income/expense type
      if (filters.type !== "all" && tx.type !== filters.type) {
        return false;
      }

      // 2. Filter by category
      if (
        filters.category !== "all" &&
        String(tx.category || "").toLowerCase() !== filters.category.toLowerCase()
      ) {
        return false;
      }

      // 3. Filter by date range
      if (filters.startDate) {
        const txDate = tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "";
        if (txDate && txDate < filters.startDate) return false;
      }
      if (filters.endDate) {
        const txDate = tx.date ? new Date(tx.date).toISOString().slice(0, 10) : "";
        if (txDate && txDate > filters.endDate) return false;
      }

      // 4. Search by title or note
      const query = filters.search.trim().toLowerCase();
      if (query) {
        const titleMatch = String(tx.title || "").toLowerCase().includes(query);
        const noteMatch = String(tx.note || "").toLowerCase().includes(query);
        const categoryMatch = String(tx.category || "").toLowerCase().includes(query);
        if (!titleMatch && !noteMatch && !categoryMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, filters]);

  // Overall Financial Totals
  const income = useMemo(
    () =>
      transactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [transactions]
  );

  const expenses = useMemo(
    () =>
      transactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [transactions]
  );

  const balance = income - expenses;

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const totals = transactions
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => {
        const key = item.category || "Uncategorized";
        acc[key] = (acc[key] || 0) + Number(item.amount || 0);
        return acc;
      }, {});

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => ({ category, total }));
  }, [transactions]);

  // Monthly Summary for the active month
  const monthlySummary = useMemo(() => {
    const [targetYear, targetMonthNum] = selectedMonth.split("-").map(Number);
    const targetMonthIndex = (targetMonthNum || 1) - 1;

    const monthTransactions = transactions.filter((item) => {
      if (!item.date) return false;
      const date = new Date(item.date);
      return (
        !isNaN(date.getTime()) &&
        date.getMonth() === targetMonthIndex &&
        date.getFullYear() === targetYear
      );
    });

    return {
      income: monthTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      expenses: monthTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [transactions, selectedMonth]);

  // Check for budget alerts in the selected month
  const budgetAlerts = useMemo(() => {
    const monthBudgets = budgets.filter((b) => b.month === selectedMonth);
    const monthExpenses = transactions.filter((tx) => {
      if (tx.type !== "expense" || !tx.date) return false;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return false;
      const txMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return txMonth === selectedMonth;
    });

    const exceeded = [];
    const warning = [];

    monthBudgets.forEach((b) => {
      const spent = monthExpenses
        .filter((tx) => String(tx.category || "").trim().toLowerCase() === String(b.category || "").trim().toLowerCase())
        .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const limit = Number(b.amount || 0);
      const pct = limit > 0 ? (spent / limit) * 100 : 0;

      if (pct >= 100) {
        exceeded.push({ ...b, spent, limit, pct, overAmount: spent - limit });
      } else if (pct >= 80) {
        warning.push({ ...b, spent, limit, pct });
      }
    });

    return { exceeded, warning };
  }, [budgets, transactions, selectedMonth]);

  const stats = [
    {
      title: "Total Balance",
      value: money(balance),
      icon: Wallet,
      note: "Total income minus expenses",
      color: balance >= 0 ? "text-emerald-400" : "text-rose-400",
    },
    {
      title: "Total Income",
      value: money(income),
      icon: ArrowUpRight,
      note: "Cumulative money received",
      color: "text-emerald-400",
    },
    {
      title: "Total Expenses",
      value: money(expenses),
      icon: ArrowDownRight,
      note: "Cumulative money spent",
      color: "text-rose-400",
    },
  ];

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setTransactions([]);
    setBudgets([]);
    setFilters(initialFilters);
    setIsFormOpen(false);
    setEditingId(null);
    setTransactionForm(defaultTransactionForm);
  };

  const loadTransactions = async () => {
    setFetchLoading(true);
    setNetworkError("");
    try {
      const data = await transactionsApi.list();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Load transactions error:", error.message);
      setNetworkError(error.message);
      setTransactions([]);
    } finally {
      setFetchLoading(false);
    }
  };

  const loadBudgets = async () => {
    setBudgetsLoading(true);
    try {
      const data = await budgetsApi.list();
      setBudgets(data.budgets || []);
    } catch (error) {
      console.error("Load budgets error:", error.message);
      setBudgets([]);
    } finally {
      setBudgetsLoading(false);
    }
  };

  const loadAppData = async () => {
    await Promise.all([loadTransactions(), loadBudgets()]);
  };

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) return;

    const fetchSession = async () => {
      try {
        const data = await authApi.me();
        setToken(savedToken);
        setUser(data.user);
        await loadAppData();
      } catch (error) {
        console.error("Session load error:", error.message);
        clearSession();
      }
    };

    fetchSession();
  }, []);

  // Listen for session expiration events from api client
  useEffect(() => {
    const handleExpired = (event) => {
      clearSession();
      setAuthError(event?.detail?.message || "Your session has expired. Please log in again.");
    };
    window.addEventListener("finora_session_expired", handleExpired);
    return () => window.removeEventListener("finora_session_expired", handleExpired);
  }, []);

  const handleAuthChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload =
        authMode === "login"
          ? { email: authForm.email, password: authForm.password }
          : { name: authForm.name, email: authForm.email, password: authForm.password };

      const data =
        authMode === "login"
          ? await authApi.login(payload)
          : await authApi.register(payload);

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthForm({ name: "", email: "", password: "" });
      setAuthMode("login");
      await loadAppData();
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      ...defaultTransactionForm,
      date: getTodayString(),
    });
    setEditingId(null);
    setTransactionError("");
  };

  const handleTransactionChange = (field, value) => {
    setTransactionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    setTransactionLoading(true);
    setTransactionError("");

    try {
      const payload = {
        title: transactionForm.title.trim(),
        amount: Number(transactionForm.amount),
        type: transactionForm.type,
        category: transactionForm.category.trim(),
        date: transactionForm.date,
        note: transactionForm.note.trim(),
      };

      if (!payload.title || !payload.category) {
        throw new Error("Title and category are required.");
      }

      if (!payload.amount || Number(payload.amount) <= 0) {
        throw new Error("Amount must be greater than zero.");
      }

      if (!["income", "expense"].includes(payload.type)) {
        throw new Error("Type must be income or expense.");
      }

      if (editingId) {
        await transactionsApi.update(editingId, payload);
      } else {
        await transactionsApi.create(payload);
      }

      resetTransactionForm();
      setIsFormOpen(false);
      await loadTransactions();
    } catch (error) {
      setTransactionError(error.message || "Failed to save transaction.");
    } finally {
      setTransactionLoading(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setEditingId(transaction._id);
    setTransactionForm({
      title: transaction.title,
      amount: String(transaction.amount),
      type: transaction.type,
      category: transaction.category,
      date: transaction.date
        ? new Date(transaction.date).toISOString().slice(0, 10)
        : getTodayString(),
      note: transaction.note || "",
    });
    setTransactionError("");
    setIsFormOpen(true);
  };

  const handleDeleteTransaction = async (id) => {
    const confirmed = window.confirm("Delete this transaction? This action cannot be undone.");
    if (!confirmed) return;

    setDeleteLoadingId(id);
    try {
      await transactionsApi.remove(id);
      await loadTransactions();
    } catch (error) {
      alert(error.message || "Failed to delete transaction.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Budget management handlers
  const handleSaveBudget = async (budgetData) => {
    if (budgetData.id) {
      await budgetsApi.update(budgetData.id, {
        category: budgetData.category,
        amount: budgetData.amount,
        month: budgetData.month,
      });
    } else {
      await budgetsApi.create({
        category: budgetData.category,
        amount: budgetData.amount,
        month: budgetData.month,
      });
    }
    await loadBudgets();
  };

  const handleDeleteBudget = async (id) => {
    await budgetsApi.remove(id);
    await loadBudgets();
  };

  const isFiltered =
    filters.type !== "all" ||
    filters.category !== "all" ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.search.trim());

  // If unauthenticated, show modern login / register screen
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] p-5 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111114] p-6 shadow-2xl shadow-black/20">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              <span className="text-emerald-400">◈</span> Finora
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Personal Finance Tracker &amp; Budget Manager
            </p>
          </div>

          <div className="mb-5 flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                authMode === "login"
                  ? "bg-emerald-400 text-black font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                authMode === "register"
                  ? "bg-emerald-400 text-black font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            {authMode === "register" && (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={authForm.name}
                  onChange={(e) => handleAuthChange("name", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                  placeholder="John Doe"
                  required={authMode === "register"}
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                value={authForm.email}
                onChange={(e) => handleAuthChange("email", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                placeholder="email@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={authForm.password}
                onChange={(e) => handleAuthChange("password", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-sm text-white outline-none transition focus:border-emerald-400"
                placeholder="Minimum 6 characters"
                required
              />
            </div>

            {authError && (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {authLoading
                ? authMode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : authMode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-100 md:flex">
      {/* Sidebar Navigation */}
      <aside className="w-full border-b border-white/10 bg-[#111114] p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-emerald-400">◈</span> Finora
            </h1>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>

          <p className="mb-4 mt-2 text-[10px] uppercase tracking-wider text-slate-500">
            Personal Finance
          </p>

          <nav className="flex gap-2 overflow-x-auto md:flex-col pb-2 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === "dashboard"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("transactions")}
              className={`flex shrink-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === "transactions"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <ArrowLeftRight size={18} />
                Transactions
              </div>
              {isFiltered && (
                <span className="h-2 w-2 rounded-full bg-emerald-400" title="Filters active" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("budgets")}
              className={`flex shrink-0 items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === "budgets"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Wallet size={18} />
                Budgets
              </div>
              {budgetAlerts.exceeded.length > 0 ? (
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300 font-semibold">
                  {budgetAlerts.exceeded.length}
                </span>
              ) : budgetAlerts.warning.length > 0 ? (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300 font-semibold">
                  {budgetAlerts.warning.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                activeTab === "analytics"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <ChartNoAxesCombined size={18} />
              Analytics
            </button>
          </nav>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold text-slate-300">Logged in as</p>
          <p className="mt-1 text-sm font-medium text-white truncate">
            {user ? user.name : "Active User"}
          </p>
          <p className="text-xs text-slate-400 truncate">{user ? user.email : ""}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 p-5 md:p-8">
        {/* Top Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 font-mono">
              FINORA · {selectedMonth}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {activeTab === "dashboard" && "Financial Dashboard"}
              {activeTab === "transactions" && "Transaction Records"}
              {activeTab === "budgets" && "Budget Tracking"}
              {activeTab === "analytics" && "Analytics & Trends"}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {activeTab === "dashboard" && "High-level summary of your income, expenses, and budget limits."}
              {activeTab === "transactions" && "Filter, search, add, and organize your transaction history."}
              {activeTab === "budgets" && "Set category limits and stay alert before you overspend."}
              {activeTab === "analytics" && "Deep-dive charts and spending breakdown by category and month."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadAppData}
              disabled={fetchLoading || budgetsLoading}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 transition disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw size={14} className={fetchLoading || budgetsLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetTransactionForm();
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-emerald-300"
            >
              <Plus size={16} />
              Add Transaction
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/15 font-semibold text-emerald-400">
              {user ? getInitials(user.name) : "U"}
            </div>
          </div>
        </header>

        {/* Network Warning Banner */}
        {networkError && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{networkError}</span>
            </div>
            <button
              type="button"
              onClick={loadAppData}
              className="rounded-lg bg-rose-500/20 px-3 py-1 font-semibold text-rose-300 hover:bg-rose-500/30"
            >
              Retry
            </button>
          </div>
        )}

        {/* Global Budget Alert Bar (Appears if any category is nearly exhausted or exceeded) */}
        {budgetAlerts.exceeded.length > 0 && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-200">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-rose-400 shrink-0" />
              <div>
                <strong className="text-sm font-semibold text-rose-300">
                  Budget Exceeded:
                </strong>{" "}
                {budgetAlerts.exceeded.map((b) => (
                  <span key={b._id} className="mr-2">
                    {b.category} (+{money(b.overAmount)} over limit)
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("budgets")}
              className="shrink-0 rounded-lg bg-rose-500/20 px-3 py-1 font-semibold text-rose-300 hover:bg-rose-500/30"
            >
              View Budgets
            </button>
          </div>
        )}

        {budgetAlerts.warning.length > 0 && budgetAlerts.exceeded.length === 0 && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400 shrink-0" />
              <div>
                <strong className="text-sm font-semibold text-amber-300">
                  Budget Warning:
                </strong>{" "}
                {budgetAlerts.warning.map((b) => (
                  <span key={b._id} className="mr-2">
                    {b.category} is at {b.pct.toFixed(0)}% capacity
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("budgets")}
              className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1 font-semibold text-amber-300 hover:bg-amber-500/30"
            >
              Review
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <article
                    key={stat.title}
                    className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 transition hover:border-emerald-400/30"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-400">{stat.title}</p>
                      <span className="rounded-xl bg-emerald-400/10 p-2 text-emerald-400">
                        <Icon size={18} />
                      </span>
                    </div>
                    <p className={`mt-4 text-2xl font-bold tracking-tight ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{stat.note}</p>
                  </article>
                );
              })}
            </section>

            {/* Cash Flow Chart & Current Month Snapshot */}
            <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <article className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Monthly Cash Flow Trend</h3>
                    <p className="text-xs text-slate-400">
                      Income versus expenses across recent months
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("analytics")}
                    className="text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    Full Analytics →
                  </button>
                </div>
                <MonthlyComparisonChart transactions={transactions} />
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">Month Summary</h3>
                    <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-slate-300 font-mono">
                      {selectedMonth}
                    </span>
                  </div>

                  <p className="mt-6 text-3xl font-bold text-white">
                    {money(Math.max(0, monthlySummary.income - monthlySummary.expenses))}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Net savings this month</p>

                  <div className="mt-5 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                      style={{
                        width: `${
                          monthlySummary.income > 0
                            ? Math.min(
                                100,
                                Math.max(
                                  0,
                                  Math.round(
                                    ((monthlySummary.income - monthlySummary.expenses) /
                                      monthlySummary.income) *
                                      100
                                  )
                                )
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-emerald-400 font-medium">
                    {monthlySummary.income > 0
                      ? `${Math.max(
                          0,
                          Math.round(
                            ((monthlySummary.income - monthlySummary.expenses) /
                              monthlySummary.income) *
                              100
                          )
                        )}% savings rate`
                      : "0% savings rate"}
                  </p>
                </div>

                <div className="mt-6 space-y-2.5 rounded-xl border border-white/5 bg-[#09090b] p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Monthly Inflow:</span>
                    <span className="font-semibold text-emerald-400">
                      +{money(monthlySummary.income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Monthly Outflow:</span>
                    <span className="font-semibold text-rose-400">
                      -{money(monthlySummary.expenses)}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Net Monthly Flow:</span>
                    <span className="font-bold text-white">
                      {money(monthlySummary.income - monthlySummary.expenses)}
                    </span>
                  </div>
                </div>
              </article>
            </section>

            {/* Expense Breakdown Donut & Quick Budget Overview */}
            <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <article className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Expense Distribution</h3>
                    <p className="text-xs text-slate-400">Spending by category</p>
                  </div>
                </div>
                <CategoryDonutChart transactions={transactions} />
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">Budget Status</h3>
                    <p className="text-xs text-slate-400">{selectedMonth} Limits</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("budgets")}
                    className="text-xs font-semibold text-emerald-400 hover:underline"
                  >
                    Manage Budgets →
                  </button>
                </div>

                {budgets.filter((b) => b.month === selectedMonth).length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-[#09090b] p-6 text-center text-xs text-slate-400">
                    No budgets configured for {selectedMonth}.
                    <button
                      type="button"
                      onClick={() => setActiveTab("budgets")}
                      className="mt-2 block mx-auto text-emerald-400 hover:underline"
                    >
                      + Set category budget
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {budgets
                      .filter((b) => b.month === selectedMonth)
                      .slice(0, 4)
                      .map((b) => {
                        const spent = transactions
                          .filter(
                            (tx) =>
                              tx.type === "expense" &&
                              tx.category?.toLowerCase() === b.category?.toLowerCase() &&
                              tx.date &&
                              tx.date.slice(0, 7) === selectedMonth
                          )
                          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
                        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
                        const isExceeded = pct >= 100;
                        const isWarn = pct >= 80 && pct < 100;

                        return (
                          <div key={b._id} className="rounded-xl border border-white/5 bg-[#09090b] p-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-200">{b.category}</span>
                              <span
                                className={`font-semibold ${
                                  isExceeded ? "text-rose-400" : isWarn ? "text-amber-400" : "text-emerald-400"
                                }`}
                              >
                                {money(spent)} / {money(b.amount)}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isExceeded ? "bg-rose-500" : isWarn ? "bg-amber-400" : "bg-emerald-400"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </article>
            </section>

            {/* Recent Transactions Preview */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Recent Transactions</h3>
                  <p className="text-xs text-slate-400">Latest financial entries</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("transactions")}
                  className="text-xs font-semibold text-emerald-400 hover:underline"
                >
                  View All &amp; Filter ({transactions.length}) →
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#09090b] p-6 text-center text-xs text-slate-400">
                  No transactions found. Click &quot;Add Transaction&quot; above to create your first record.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400">
                        <th className="pb-3 font-medium">TRANSACTION</th>
                        <th className="pb-3 font-medium">DATE</th>
                        <th className="pb-3 font-medium">AMOUNT</th>
                        <th className="pb-3 font-medium">CATEGORY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 5).map((tx) => (
                        <tr key={tx._id} className="border-b border-white/[0.04] last:border-0">
                          <td className="py-3">
                            <span className="font-medium text-white">{tx.title}</span>
                          </td>
                          <td className="py-3 text-slate-400">{formatDate(tx.date)}</td>
                          <td
                            className={`py-3 font-semibold ${
                              tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {money(tx.amount)}
                          </td>
                          <td className="py-3 text-slate-300">{tx.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: TRANSACTIONS VIEW (WITH FULL FILTERS & REAL DATA) */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <TransactionFilters
              filters={filters}
              onChange={setFilters}
              onClear={() => setFilters(initialFilters)}
              availableCategories={availableCategories}
              totalCount={transactions.length}
              filteredCount={filteredTransactions.length}
            />

            {/* Transactions Table */}
            <section className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">Transactions List</h3>
                  <p className="text-xs text-slate-400">
                    {isFiltered
                      ? `Matching ${filteredTransactions.length} of ${transactions.length} entries`
                      : `All ${transactions.length} recorded entries`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    resetTransactionForm();
                    setIsFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 py-2 text-xs font-semibold text-black hover:bg-emerald-300"
                >
                  <Plus size={15} />
                  Add New
                </button>
              </div>

              {fetchLoading ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-xs text-slate-400">
                  Loading transactions...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-[#09090b] p-8 text-center text-xs text-slate-400">
                  {isFiltered ? (
                    <div>
                      <p className="font-medium text-slate-300">
                        No transactions match your current filters.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFilters(initialFilters)}
                        className="mt-2 text-emerald-400 hover:underline"
                      >
                        Reset filters to see all transactions
                      </button>
                    </div>
                  ) : (
                    "No transactions recorded yet. Click 'Add Transaction' to begin."
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider text-[11px]">
                        <th className="pb-3 font-medium">TRANSACTION</th>
                        <th className="pb-3 font-medium">DATE</th>
                        <th className="pb-3 font-medium">AMOUNT</th>
                        <th className="pb-3 font-medium">CATEGORY</th>
                        <th className="pb-3 font-medium">NOTE</th>
                        <th className="pb-3 text-right font-medium">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx) => (
                        <tr
                          key={tx._id}
                          className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.01]"
                        >
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-semibold text-slate-300">
                                {getInitials(tx.title)}
                              </span>
                              <div>
                                <p className="font-medium text-white">{tx.title}</p>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                  {tx.type}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 text-slate-400">{formatDate(tx.date)}</td>

                          <td
                            className={`py-3.5 font-semibold ${
                              tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {money(tx.amount)}
                          </td>

                          <td className="py-3.5 text-slate-300">{tx.category}</td>

                          <td className="py-3.5 text-slate-400 max-w-[150px] truncate">
                            {tx.note || "—"}
                          </td>

                          <td className="py-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditTransaction(tx)}
                                className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx._id)}
                                disabled={deleteLoadingId === tx._id}
                                className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-1.5 text-rose-400 hover:bg-rose-500/15 disabled:opacity-50"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: BUDGETS VIEW (DATABASE PERSISTED & SCOPED) */}
        {activeTab === "budgets" && (
          <BudgetManager
            budgets={budgets}
            transactions={transactions}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
            loading={budgetsLoading}
            availableCategories={availableCategories}
          />
        )}

        {/* TAB 4: ANALYTICS & TRENDS VIEW */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
              <div className="mb-4">
                <h3 className="font-semibold text-white">Monthly Inflow vs Outflow</h3>
                <p className="text-xs text-slate-400">
                  Compare total earnings against spending per month
                </p>
              </div>
              <MonthlyComparisonChart transactions={transactions} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <article className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5">
                <div className="mb-4">
                  <h3 className="font-semibold text-white">Expense Distribution</h3>
                  <p className="text-xs text-slate-400">Spending breakdown across all categories</p>
                </div>
                <CategoryDonutChart transactions={transactions} />
              </article>

              <article className="rounded-2xl border border-white/[0.08] bg-[#111114] p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-white">Category Ranking</h3>
                  <p className="text-xs text-slate-400">Highest to lowest spending</p>

                  <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {categoryBreakdown.length === 0 ? (
                      <p className="text-xs text-slate-500">No expenses recorded yet.</p>
                    ) : (
                      categoryBreakdown.map((item, idx) => (
                        <div
                          key={item.category}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-[#09090b] p-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded bg-white/5 font-mono text-[10px] text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="font-medium text-slate-200">{item.category}</span>
                          </div>
                          <span className="font-semibold text-rose-300">
                            {money(item.total)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/5 bg-[#09090b] p-3 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Expense Volume:</span>
                    <span className="font-bold text-rose-400">{money(expenses)}</span>
                  </div>
                </div>
              </article>
            </section>
          </div>
        )}

        <footer className="mt-12 py-6 text-center text-xs text-slate-600">
          Finora · Personal Finance Tracker &amp; Budgeting System
        </footer>
      </main>

      {/* Transaction Create / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111114] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {editingId ? "Edit Transaction" : "Add Transaction"}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingId ? "Update your transaction record" : "Record a new income or expense"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetTransactionForm();
                }}
                className="rounded-lg border border-white/10 p-2 text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Title</label>
                <input
                  type="text"
                  value={transactionForm.title}
                  onChange={(e) => handleTransactionChange("title", e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                  placeholder="e.g. Salary, Grocery, Rent"
                  required
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Amount (₹)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => handleTransactionChange("amount", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Type</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => handleTransactionChange("type", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Income (+)</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Category</label>
                  <input
                    type="text"
                    value={transactionForm.category}
                    onChange={(e) => handleTransactionChange("category", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                    placeholder="e.g. Food, Utilities, Salary"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">Date</label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => handleTransactionChange("date", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">Note (Optional)</label>
                <textarea
                  rows="2"
                  value={transactionForm.note}
                  onChange={(e) => handleTransactionChange("note", e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-emerald-400"
                  placeholder="Optional details or memo"
                />
              </div>

              {transactionError && (
                <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300">
                  {transactionError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetTransactionForm();
                  }}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transactionLoading}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-300 disabled:opacity-60"
                >
                  {transactionLoading
                    ? "Saving..."
                    : editingId
                    ? "Update Transaction"
                    : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
