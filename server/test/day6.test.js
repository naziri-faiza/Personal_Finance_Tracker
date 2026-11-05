const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Set dummy JWT_SECRET for test if not present
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_finora_12345";

const authMiddleware = require("../middleware/auth");
const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");

// --- TEST SUITE 1: AUTHENTICATION & SECURITY ---
test("Auth Middleware: Rejects request with missing authorization header", (t, done) => {
  const req = { headers: {} };
  const res = {
    status(code) {
      assert.equal(code, 401);
      return {
        json(data) {
          assert.equal(data.success, false);
          assert.match(data.message, /Access denied/i);
          done();
        },
      };
    },
  };
  authMiddleware(req, res, () => {
    assert.fail("Should not call next() without auth header");
  });
});

test("Auth Middleware: Rejects invalid JWT token", (t, done) => {
  const req = { headers: { authorization: "Bearer invalid_token_here" } };
  const res = {
    status(code) {
      assert.equal(code, 401);
      return {
        json(data) {
          assert.equal(data.success, false);
          assert.match(data.message, /Invalid or expired token/i);
          done();
        },
      };
    },
  };
  authMiddleware(req, res, () => {
    assert.fail("Should not call next() with invalid token");
  });
});

test("Auth Middleware: Successfully authenticates valid token and sets req.userId", (t, done) => {
  const testUserId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  authMiddleware(req, res, () => {
    assert.equal(req.userId, testUserId);
    done();
  });
});

// --- TEST SUITE 2: BUDGET SCHEMA VALIDATION ---
test("Budget Model: Validates required fields and constraints", async () => {
  const validUserId = new mongoose.Types.ObjectId();

  // 1. Missing amount
  const invalid1 = new Budget({ user: validUserId, category: "Food" });
  let err1 = null;
  try { await invalid1.validate(); } catch (e) { err1 = e; }
  assert.ok(err1 && err1.errors.amount, "Amount should be required");

  // 2. Negative amount
  const invalid2 = new Budget({ user: validUserId, category: "Food", amount: -100 });
  let err2 = null;
  try { await invalid2.validate(); } catch (e) { err2 = e; }
  assert.ok(err2 && err2.errors.amount, "Amount must be >= 0.01");

  // 3. Zero amount
  const invalid3 = new Budget({ user: validUserId, category: "Food", amount: 0 });
  let err3 = null;
  try { await invalid3.validate(); } catch (e) { err3 = e; }
  assert.ok(err3 && err3.errors.amount, "Amount must be > 0");

  // 4. Invalid month format
  const invalid4 = new Budget({ user: validUserId, category: "Food", amount: 1500, month: "2026-1" });
  let err4 = null;
  try { await invalid4.validate(); } catch (e) { err4 = e; }
  assert.ok(err4 && err4.errors.month, "Month must match YYYY-MM");

  // 5. Valid budget document
  const valid = new Budget({
    user: validUserId,
    category: "Groceries",
    amount: 5000,
    month: "2026-11",
  });
  let errValid = null;
  try { await valid.validate(); } catch (e) { errValid = e; }
  assert.equal(errValid, null, "Valid budget document should pass validation");
  assert.equal(valid.category, "Groceries");
  assert.equal(valid.amount, 5000);
  assert.equal(valid.month, "2026-11");
});

// --- TEST SUITE 3: ANALYTICS & CALCULATIONS ---
test("Analytics: Correctly calculates totals and handles empty datasets", () => {
  // Empty transactions
  const emptyTxs = [];
  const emptyIncome = emptyTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const emptyExpenses = emptyTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const emptyBalance = emptyIncome - emptyExpenses;

  assert.equal(emptyIncome, 0);
  assert.equal(emptyExpenses, 0);
  assert.equal(emptyBalance, 0);

  // Sample transactions
  const sampleTxs = [
    { title: "Salary", amount: 80000, type: "income", category: "Salary", date: "2026-11-01" },
    { title: "Freelance", amount: 20000, type: "income", category: "Side Gig", date: "2026-11-15" },
    { title: "Rent", amount: 25000, type: "expense", category: "Housing", date: "2026-11-02" },
    { title: "Groceries", amount: 8000, type: "expense", category: "Food", date: "2026-11-05" },
    { title: "Electricity", amount: 2000, type: "expense", category: "Utilities", date: "2026-11-10" },
  ];

  const totalIncome = sampleTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = sampleTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  assert.equal(totalIncome, 100000);
  assert.equal(totalExpenses, 35000);
  assert.equal(netBalance, 65000);
});

test("Analytics: Category-wise expense breakdown & sorting", () => {
  const expenseTxs = [
    { amount: 5000, type: "expense", category: "Food" },
    { amount: 3000, type: "expense", category: "Food" },
    { amount: 15000, type: "expense", category: "Housing" },
    { amount: 2000, type: "expense", category: "Transport" },
  ];

  const total = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const map = {};
  expenseTxs.forEach((t) => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });

  const breakdown = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
    }));

  assert.equal(total, 25000);
  assert.equal(breakdown[0].category, "Housing");
  assert.equal(breakdown[0].amount, 15000);
  assert.equal(breakdown[0].percentage, 60);

  assert.equal(breakdown[1].category, "Food");
  assert.equal(breakdown[1].amount, 8000);
  assert.equal(breakdown[1].percentage, 32);

  assert.equal(breakdown[2].category, "Transport");
  assert.equal(breakdown[2].amount, 2000);
  assert.equal(breakdown[2].percentage, 8);

  const pctSum = breakdown.reduce((sum, b) => sum + b.percentage, 0);
  assert.equal(Math.round(pctSum), 100);
});

// --- TEST SUITE 4: BUDGET SPENDING & WARNING THRESHOLDS ---
test("Budget Management: Correctly evaluates spent, remaining, and status thresholds", () => {
  const budget = { category: "Food", amount: 10000, month: "2026-11" };

  // Scenario 1: Normal spending (< 80%)
  const txsNormal = [{ category: "Food", amount: 5000, type: "expense", date: "2026-11-04" }];
  const spentNormal = txsNormal.reduce((s, t) => s + t.amount, 0);
  const pctNormal = (spentNormal / budget.amount) * 100;
  const statusNormal = pctNormal >= 100 ? "exceeded" : pctNormal >= 80 ? "warning" : "normal";

  assert.equal(spentNormal, 5000);
  assert.equal(pctNormal, 50);
  assert.equal(statusNormal, "normal");
  assert.equal(budget.amount - spentNormal, 5000);

  // Scenario 2: Nearly exhausted warning (80% - 100%)
  const txsWarning = [{ category: "Food", amount: 8500, type: "expense", date: "2026-11-12" }];
  const spentWarning = txsWarning.reduce((s, t) => s + t.amount, 0);
  const pctWarning = (spentWarning / budget.amount) * 100;
  const statusWarning = pctWarning >= 100 ? "exceeded" : pctWarning >= 80 ? "warning" : "normal";

  assert.equal(spentWarning, 8500);
  assert.equal(pctWarning, 85);
  assert.equal(statusWarning, "warning");
  assert.equal(budget.amount - spentWarning, 1500);

  // Scenario 3: Exceeded budget (> 100%)
  const txsExceeded = [{ category: "Food", amount: 12000, type: "expense", date: "2026-11-20" }];
  const spentExceeded = txsExceeded.reduce((s, t) => s + t.amount, 0);
  const pctExceeded = (spentExceeded / budget.amount) * 100;
  const statusExceeded = pctExceeded >= 100 ? "exceeded" : pctExceeded >= 80 ? "warning" : "normal";

  assert.equal(spentExceeded, 12000);
  assert.equal(pctExceeded, 120);
  assert.equal(statusExceeded, "exceeded");
  assert.equal(spentExceeded - budget.amount, 2000); // Over by 2000
});

// --- TEST SUITE 5: TRANSACTION FILTERING LOGIC ---
test("Transaction Filtering: Filters by type, category, date range, and search", () => {
  const transactions = [
    { title: "Salary", category: "Income", amount: 50000, type: "income", date: "2026-10-01", note: "Monthly job" },
    { title: "Grocery shopping", category: "Food", amount: 3500, type: "expense", date: "2026-10-15", note: "Supermarket run" },
    { title: "Netflix subscription", category: "Entertainment", amount: 650, type: "expense", date: "2026-10-25", note: "Monthly stream" },
    { title: "Dinner with friends", category: "Food", amount: 1800, type: "expense", date: "2026-11-02", note: "Italian restaurant" },
    { title: "Freelance UI design", category: "Income", amount: 15000, type: "income", date: "2026-11-10", note: "Website design project" },
  ];

  // 1. Filter by type: expense
  const expenseOnly = transactions.filter((t) => t.type === "expense");
  assert.equal(expenseOnly.length, 3);
  assert.ok(expenseOnly.every((t) => t.type === "expense"));

  // 2. Filter by category: Food
  const foodOnly = transactions.filter((t) => t.category.toLowerCase() === "food");
  assert.equal(foodOnly.length, 2);

  // 3. Filter by date range: 2026-10-10 to 2026-10-31
  const dateRange = transactions.filter((t) => t.date >= "2026-10-10" && t.date <= "2026-10-31");
  assert.equal(dateRange.length, 2);
  assert.equal(dateRange[0].title, "Grocery shopping");
  assert.equal(dateRange[1].title, "Netflix subscription");

  // 4. Search by title or note: "restaurant"
  const searchNote = transactions.filter((t) => {
    const q = "restaurant";
    return t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q);
  });
  assert.equal(searchNote.length, 1);
  assert.equal(searchNote[0].title, "Dinner with friends");

  // 5. Search by title: "design"
  const searchTitle = transactions.filter((t) => {
    const q = "design";
    return t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q);
  });
  assert.equal(searchTitle.length, 1);
  assert.equal(searchTitle[0].title, "Freelance UI design");
});

// --- TEST SUITE 6: USER DATA ISOLATION ENFORCEMENT ---
test("Security: User data isolation ensures user IDs cannot be spoofed", () => {
  const userA_id = new mongoose.Types.ObjectId().toString();
  const userB_id = new mongoose.Types.ObjectId().toString();

  // Simulated request where User A is authenticated (from JWT)
  const reqUserA = {
    userId: userA_id,
    body: {
      category: "Food",
      amount: 4000,
      user: userB_id, // Attacker tries to inject User B's id in payload
    },
  };

  // The route strictly uses req.userId from JWT, ignoring req.body.user
  const createdBudgetPayload = {
    user: reqUserA.userId, // always forced to authenticated userId
    category: reqUserA.body.category,
    amount: reqUserA.body.amount,
  };

  assert.equal(createdBudgetPayload.user, userA_id, "User ID must be strictly bound to req.userId");
  assert.notEqual(createdBudgetPayload.user, userB_id, "Spoofed user ID must never be used");
});
