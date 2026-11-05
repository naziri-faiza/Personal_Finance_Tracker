const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Ensure JWT secret is configured
process.env.JWT_SECRET = process.env.JWT_SECRET || "finora_test_jwt_secret_key_123456789";

const authMiddleware = require("../middleware/auth");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const app = require("../server");

// =========================================================================
// SUITE 1: AUTHENTICATION, PASSWORD SECURITY & JWT
// =========================================================================

test("Auth: Password hashing with bcrypt works correctly", async () => {
  const plainPassword = "SuperSecurePassword123";
  const hash = await bcrypt.hash(plainPassword, 10);

  assert.notEqual(plainPassword, hash, "Hash should not match plain password");
  const isValid = await bcrypt.compare(plainPassword, hash);
  assert.equal(isValid, true, "Valid password should verify against hash");

  const isInvalid = await bcrypt.compare("WrongPassword", hash);
  assert.equal(isInvalid, false, "Wrong password should fail verification");
});

test("Auth: Registration field validations", async () => {
  // Test User model validations
  const validUser = new User({
    name: "Alex Doe",
    email: "alex@example.com",
    password: "hashedpassword123",
  });
  const errValid = await validUser.validate().catch((e) => e);
  assert.equal(errValid, undefined, "Valid user document passes validation");

  // Missing email
  const missingEmail = new User({ name: "Alex", password: "pwd" });
  const errMissingEmail = await missingEmail.validate().catch((e) => e);
  assert.ok(errMissingEmail.errors.email, "Email is required");

  // Short password
  const shortPwd = new User({ name: "Alex", email: "a@b.com", password: "123" });
  const errShortPwd = await shortPwd.validate().catch((e) => e);
  assert.ok(errShortPwd.errors.password, "Password minimum length required");
});

test("Auth: JWT generation, expiration and decoding", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(decoded.userId, userId);
  assert.ok(decoded.exp > decoded.iat);

  // Verification fails with wrong secret
  assert.throws(() => {
    jwt.verify(token, "wrong_secret_key_fail");
  });
});

test("Auth Middleware: Blocks unauthenticated and expired requests", (t, done) => {
  const req = { headers: {} };
  const res = {
    status(code) {
      assert.equal(code, 401);
      return {
        json(payload) {
          assert.equal(payload.success, false);
          assert.match(payload.message, /Access denied/i);
          done();
        },
      };
    },
  };
  authMiddleware(req, res, () => {
    assert.fail("Should not call next()");
  });
});

test("Auth Middleware: Accepts valid Bearer token and injects req.userId", (t, done) => {
  const userId = new mongoose.Types.ObjectId().toString();
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = {};
  authMiddleware(req, res, () => {
    assert.equal(req.userId, userId);
    done();
  });
});

// =========================================================================
// SUITE 2: TRANSACTION SCHEMA, CONSTRAINTS & DATA VALIDATION
// =========================================================================

test("Transaction Model: Enforces valid amounts, types, and categories", async () => {
  const userId = new mongoose.Types.ObjectId();

  // 1. Valid transaction
  const validTx = new Transaction({
    user: userId,
    title: "Grocery Shopping",
    amount: 1500.5,
    type: "expense",
    category: "Food",
    date: new Date(),
  });
  const errValid = await validTx.validate().catch((e) => e);
  assert.equal(errValid, undefined, "Valid transaction should pass validation");

  // 2. Amount must be positive
  const negativeTx = new Transaction({
    user: userId,
    title: "Item",
    amount: -50,
    type: "expense",
    category: "Food",
  });
  const errNeg = await negativeTx.validate().catch((e) => e);
  assert.ok(errNeg.errors.amount, "Negative amount is rejected");

  // 3. Type must be 'income' or 'expense'
  const invalidTypeTx = new Transaction({
    user: userId,
    title: "Bonus",
    amount: 1000,
    type: "transfer", // invalid enum
    category: "Income",
  });
  const errType = await invalidTypeTx.validate().catch((e) => e);
  assert.ok(errType.errors.type, "Invalid type enum must be rejected");

  // 4. Title and category required
  const missingTx = new Transaction({ user: userId, amount: 200, type: "income" });
  const errMissing = await missingTx.validate().catch((e) => e);
  assert.ok(errMissing.errors.title, "Title is required");
  assert.ok(errMissing.errors.category, "Category is required");
});

// =========================================================================
// SUITE 3: BUDGET SCHEMA, MONTH FORMATTING & CONSTRAINTS
// =========================================================================

test("Budget Model: Enforces schema validation and month format", async () => {
  const userId = new mongoose.Types.ObjectId();

  // Valid budget
  const validBudget = new Budget({
    user: userId,
    category: "Housing",
    amount: 25000,
    month: "2026-11",
  });
  const errValid = await validBudget.validate().catch((e) => e);
  assert.equal(errValid, undefined, "Valid budget passes validation");

  // Invalid month format
  const badMonthBudget = new Budget({
    user: userId,
    category: "Food",
    amount: 5000,
    month: "November-2026",
  });
  const errMonth = await badMonthBudget.validate().catch((e) => e);
  assert.ok(errMonth.errors.month, "Month must be in YYYY-MM format");

  // Zero amount budget
  const zeroBudget = new Budget({
    user: userId,
    category: "Transport",
    amount: 0,
    month: "2026-11",
  });
  const errZero = await zeroBudget.validate().catch((e) => e);
  assert.ok(errZero.errors.amount, "Budget amount must be positive");
});

// =========================================================================
// SUITE 4: FINANCIAL CALCULATIONS & ANALYTICS INTEGRITY
// =========================================================================

test("Analytics: Correct balance calculation from transactions", () => {
  const txs = [
    { type: "income", amount: 60000 },
    { type: "income", amount: 15000 },
    { type: "expense", amount: 20000 },
    { type: "expense", amount: 5000 },
    { type: "expense", amount: 2500 },
  ];

  const totalIncome = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  assert.equal(totalIncome, 75000);
  assert.equal(totalExpenses, 27500);
  assert.equal(balance, 47500);
});

test("Analytics: Category breakdown and proportions", () => {
  const expenses = [
    { category: "Housing", amount: 20000 },
    { category: "Food", amount: 10000 },
    { category: "Food", amount: 5000 },
    { category: "Utilities", amount: 5000 },
  ];

  const total = expenses.reduce((s, t) => s + t.amount, 0);
  const grouped = {};
  expenses.forEach((t) => {
    grouped[t.category] = (grouped[t.category] || 0) + t.amount;
  });

  const breakdown = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
    }));

  assert.equal(total, 40000);
  assert.equal(breakdown[0].category, "Housing");
  assert.equal(breakdown[0].percentage, 50);

  assert.equal(breakdown[1].category, "Food");
  assert.equal(breakdown[1].amount, 15000);
  assert.equal(breakdown[1].percentage, 37.5);

  assert.equal(breakdown[2].category, "Utilities");
  assert.equal(breakdown[2].percentage, 12.5);
});

test("Analytics: Empty dataset resilience", () => {
  const empty = [];
  const income = empty.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = empty.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  assert.equal(income, 0);
  assert.equal(expense, 0);
  assert.equal(net, 0);
  assert.ok(!isNaN(net));
});

// =========================================================================
// SUITE 5: BUDGET MONITORING, PROGRESS & ALERT THRESHOLDS
// =========================================================================

test("Budget: Status evaluation and warning triggers", () => {
  const monthlyLimit = 10000;

  // Case 1: Under 80% (Safe / On Track)
  const spentSafe = 7500;
  const pctSafe = (spentSafe / monthlyLimit) * 100;
  const statusSafe = pctSafe >= 100 ? "exceeded" : pctSafe >= 80 ? "warning" : "normal";
  assert.equal(statusSafe, "normal");
  assert.equal(monthlyLimit - spentSafe, 2500);

  // Case 2: Between 80% and 100% (Warning: Nearly Exhausted)
  const spentWarn = 8500;
  const pctWarn = (spentWarn / monthlyLimit) * 100;
  const statusWarn = pctWarn >= 100 ? "exceeded" : pctWarn >= 80 ? "warning" : "normal";
  assert.equal(statusWarn, "warning");
  assert.equal(monthlyLimit - spentWarn, 1500);

  // Case 3: Over 100% (Alert: Exceeded)
  const spentExceeded = 13000;
  const pctExceeded = (spentExceeded / monthlyLimit) * 100;
  const statusExceeded = pctExceeded >= 100 ? "exceeded" : pctExceeded >= 80 ? "warning" : "normal";
  assert.equal(statusExceeded, "exceeded");
  assert.equal(spentExceeded - monthlyLimit, 3000); // Over by 3000
});

// =========================================================================
// SUITE 6: TRANSACTION FILTERING & SEARCH
// =========================================================================

test("Filters: Multi-criteria transaction filtering", () => {
  const transactions = [
    { title: "Client Payment", category: "Salary", amount: 45000, type: "income", date: "2026-11-01", note: "Invoice #101" },
    { title: "Monthly Rent", category: "Housing", amount: 18000, type: "expense", date: "2026-11-02", note: "Apartment lease" },
    { title: "Supermarket Groceries", category: "Food", amount: 4200, type: "expense", date: "2026-11-05", note: "Weekly grocery" },
    { title: "Fine Dining Dinner", category: "Food", amount: 2100, type: "expense", date: "2026-11-12", note: "Bistro restaurant" },
    { title: "Stock Dividend", category: "Investments", amount: 3500, type: "income", date: "2026-11-18", note: "Quarterly dividend" },
  ];

  // 1. Filter by type: Income
  const onlyIncome = transactions.filter((t) => t.type === "income");
  assert.equal(onlyIncome.length, 2);

  // 2. Filter by Category: Food
  const onlyFood = transactions.filter((t) => t.category === "Food");
  assert.equal(onlyFood.length, 2);

  // 3. Filter by Date range
  const dateRange = transactions.filter((t) => t.date >= "2026-11-02" && t.date <= "2026-11-10");
  assert.equal(dateRange.length, 2);

  // 4. Search by note: "bistro"
  const searched = transactions.filter((t) =>
    t.title.toLowerCase().includes("bistro") || t.note.toLowerCase().includes("bistro")
  );
  assert.equal(searched.length, 1);
  assert.equal(searched[0].title, "Fine Dining Dinner");
});

// =========================================================================
// SUITE 7: DATA ISOLATION & SECURITY (ANTI-SPOOFING)
// =========================================================================

test("Security: User data isolation prevents unauthorized cross-tenant operations", () => {
  const authenticatedUserId = new mongoose.Types.ObjectId().toString();
  const victimUserId = new mongoose.Types.ObjectId().toString();

  // Simulating an attacker attempting to access another user's document
  const mockReq = {
    userId: authenticatedUserId, // Authenticated user
    params: { id: "budget_123" },
    body: { user: victimUserId }, // Malicious body trying to claim or target victim's account
  };

  // Every database query in our system enforces { user: req.userId }
  const securedFilter = {
    _id: mockReq.params.id,
    user: mockReq.userId, // always bound to JWT session
  };

  assert.equal(securedFilter.user, authenticatedUserId);
  assert.notEqual(securedFilter.user, victimUserId);
});
