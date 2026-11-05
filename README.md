# ◈ Finora — Personal Finance Tracker & Budgeting System

[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.3-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-v9.11-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](LICENSE)

---

## 📑 Document Structure
1. [Introduction of the Project](#1-introduction-of-the-project)
2. [Tech Stack and Reason](#2-tech-stack-and-reason)
3. [Use Cases](#3-use-cases)
4. [Research & Problem Analysis](#4-research--problem-analysis)
5. [Entire Working of the Project (with Screenshots)](#5-entire-working-of-the-project-with-screenshots)
6. [Conclusion](#6-conclusion)

---

## 1. Introduction of the Project

**Finora** is a modern, responsive, and secure full-stack personal finance and budgeting management web application. In today's digital economy, financial transactions occur rapidly across multiple channels—UPI, cards, online subscriptions, cash, and digital wallets. Without deliberate tracking, individuals frequently experience "financial blindness," leading to impulsive spending, missed savings targets, and monthly budget exhaustion.

Finora solves this problem by serving as a **centralized personal financial command center**. Built with a sleek, distraction-free **dark-mode UI**, Finora enables users to:
- Securely log, categorize, and monitor all personal income and expense transactions.
- Visualize spending trends through custom interactive vector charts without bulky external dependencies.
- Define monthly category-based spending budgets that track expenditures in real-time.
- Receive immediate visual alerts before or when limits are exceeded.
- Filter historical data across multiple criteria (type, category, date range, and keyword search).
- Rely on strict **zero-trust user isolation**, ensuring every user's financial data is encrypted and securely separated.

Whether tracking daily coffee purchases, managing rent and utilities, or analyzing monthly cash flow, Finora provides actionable visibility into where money comes from and where it goes.

---

## 2. Tech Stack and Reason

Finora is built using modern full-stack web engineering standards. Every library and framework was deliberately chosen for speed, scalability, type safety, and clean user experience.

| Layer | Technology | Why It Was Chosen |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | • **Component-Driven Architecture**: Enables clean separation of concerns (Charts, Filters, Budget Manager, Modals).<br>• **Virtual DOM & Reactive State**: Instant UI updates without page reloads.<br>• **Modern Hooks**: Streamlined data flow using `useState`, `useMemo`, and `useEffect`. |
| **Frontend Build Tool** | **Vite 8** | • **Lightning-Fast HMR**: Instant Hot Module Replacement during development.<br>• **Optimized Production Bundling**: Produces compact, minified chunks (1.04s build time) via Rollup/esbuild.<br>• **Native ES Modules**: Eliminates legacy bundler overhead. |
| **Styling & Design System** | **Tailwind CSS v4** | • **Utility-First Speed**: Rapid styling without writing repetitive stylesheet files.<br>• **Dark Mode Native**: Engineered around an aesthetic `#09090b` and `#111114` dark palette.<br>• **Zero Runtime Overhead**: Compiles directly into minimal static CSS classes.<br>• **Fully Responsive**: Out-of-the-box breakpoints for mobile, tablet, and desktop viewports. |
| **Icons & UI Assets** | **Lucide React** | • **Consistent Visual Language**: Clean, accessible vector icons.<br>• **Tree-Shakeable**: Imports only the icons used, keeping bundle size minimal. |
| **Data Visualizations** | **Custom Reactive SVG Charts** | • **Zero External Dependency Bloat**: Eliminates heavy 200KB+ chart libraries.<br>• **Zero Version Incompatibility**: Prevents React 19 peer-dependency conflicts common with older libraries.<br>• **Vector Crispness**: Renders sharply at any screen density with responsive `viewBox` coordinates and hover tooltips. |
| **Backend Runtime** | **Node.js (v18+)** | • **Asynchronous Non-Blocking I/O**: Efficiently handles multiple concurrent requests.<br>• **Single Language Stack**: JavaScript across both client and server simplifies full-stack development. |
| **Web Server Framework** | **Express 5** | • **Battle-Tested & Minimalist**: Streamlined routing, request handling, and middleware architecture.<br>• **Custom Middleware Pipelines**: Modular authentication guards, CORS policies, and centralized error handling. |
| **Database & ODM** | **MongoDB Atlas + Mongoose 9** | • **Document Flexibility**: JSON-like BSON documents naturally match financial transaction objects.<br>• **Cloud Scalability**: Managed MongoDB Atlas cluster ensures high availability and automatic backups.<br>• **Schema Validation & Indexing**: Enforces strict positive amounts, enum types, compound indexes (`user + category + month`), and referential integrity. |
| **Authentication & Security** | **JSON Web Tokens (JWT) & bcryptjs** | • **Stateless JWT**: Eliminates server-side session memory overhead while securing every private API endpoint.<br>• **One-Way Salt Hashing**: Passwords salted and hashed with 10 bcrypt rounds prior to database insertion. |
| **Code Quality & Linting** | **Oxlint** | • **High-Speed Linting**: Analyzes code quality and syntax in under 100ms with zero config overhead. |

---

## 3. Use Cases

Finora addresses diverse financial management needs for various real-world scenarios:

```
                      ┌──────────────────────────────────────┐
                      │        FINORA USE CASE MATRIX        │
                      └──────────────────┬───────────────────┘
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
 ┌───────────────┐               ┌───────────────┐               ┌───────────────┐
 │   STUDENTS    │               │  FREELANCERS  │               │   FAMILIES    │
 ├───────────────┤               ├───────────────┤               ├───────────────┤
 │• Pocket money │               │• Irregular pay│               │• Household    │
 │  allowance    │               │• Cash flow    │               │  groceries    │
 │• Micro-spend  │               │• Tax planning │               │• Utility bill │
 │  tracking     │               │• Inflow vs    │               │  deadlines    │
 │• Meal budgets │               │  outflow      │               │• Category cap │
 └───────────────┘               └───────────────┘               └───────────────┘
```

### 1. Daily Expense Tracking for Students & Young Professionals
- **Scenario**: College students or young professionals on limited stipends or salaries often lose track of daily small spends (canteen, tea, rideshare, quick food delivery).
- **Finora Solution**: Quick addition of income and expense items on mobile with title, amount, category, and date. The dashboard immediately updates total remaining balance.

### 2. Monthly Budget Discipline & Overspending Prevention
- **Scenario**: A user allocates ₹6,000 for "Food & Dining" and ₹2,000 for "Entertainment", but accidentally spends ₹9,000 without realizing until their account is drained.
- **Finora Solution**: Users set category budgets per month. When spending reaches 80%, an **Amber Warning** appears. If spending exceeds 100%, a **High-Visibility Rose Alert** flags the exact overspent amount.

### 3. Irregular Cash Flow Management for Freelancers
- **Scenario**: Freelancers and gig workers receive payments on irregular dates throughout the month rather than a single fixed paycheck.
- **Finora Solution**: The **Monthly Cash Flow Trend Chart** plots monthly income against monthly expenses side-by-side, allowing freelancers to see whether their current month's burn rate is sustainable.

### 4. Tax Preparation & Deductible Expense Auditing
- **Scenario**: At the end of the financial year or quarter, users scramble through bank statements to identify deductible business expenses, donations, or medical costs.
- **Finora Solution**: The **Multi-Criteria Filter Toolbar** allows instant filtering by Category (e.g., "Healthcare", "Education") and Date Range (e.g., `2026-04-01` to `2026-11-30`), isolating exactly the records needed for filing.

### 5. Multi-User Privacy & Household Budget Separation
- **Scenario**: Multiple individuals using the same machine or shared application need complete privacy for their financial records.
- **Finora Solution**: Robust JWT authorization and database query scoping ensure User A cannot view, edit, or tamper with User B's transactions or budgets under any circumstance.

---

## 4. Research & Problem Analysis

### 4.1 The Core Problem: Why Most Budgeting Efforts Fail
Academic and behavioral financial research reveals three recurring friction points:

1. **The Friction of Overcomplicated Banking Apps**: Traditional banking applications show statement history but lack forward-looking categorization, customizable monthly category limits, or intuitive cash flow visualizations.
2. **Privacy Violations in Automated Trackers**: Popular budgeting apps demand full access to personal SMS inboxes, email receipts, or banking credentials, exposing sensitive financial footprints to third-party data aggregators.
3. **The Fragility of Spreadsheets**: While spreadsheet templates (Excel, Google Sheets) offer customization, they require tedious manual formula maintenance, break easily on mobile screens, and fail to provide automated visual warnings when limits are approached.

```
                           FINANCIAL TOOL GAP ANALYSIS
   ┌───────────────────────┬───────────────────────┬───────────────────────┐
   │ Feature / Aspect      │ Banking Apps / SMS    │ Spreadsheet (Excel)   │ Finora Tracker        │
   ├───────────────────────┼───────────────────────┼───────────────────────┤
   │ Privacy & Data Control│ ❌ Sells/Reads SMS    │ ⚠️ Cloud Synced       │ ✅ Private & Scoped   │
   │ Mobile Friendly UI    │ ⚠️ Heavy / Cluttered  │ ❌ Broken on Mobile   │ ✅ Responsive Dark UI │
   │ Budget Warning System │ ❌ Post-facto only    │ ⚠️ Complex Formulas   │ ✅ Dynamic 80%/100%   │
   │ Visual Analytics      │ ❌ Generic pie chart  │ ⚠️ Static graphs      │ ✅ Interactive SVG    │
   │ Real-time Filtering   │ ❌ Slow server search │ ⚠️ Manual table filter│ ✅ Instant In-Memory  │
   │ Setup Friction        │ ❌ High (Bank Link)   │ ❌ High (Formulas)    │ ✅ Zero (Instant Acc) │
   └───────────────────────┴───────────────────────┴───────────────────────┘
```

### 4.2 User Needs Identified Through Research
- **Speed & Immediacy**: Logging an expense should take under 5 seconds.
- **Contextual Clarity**: Users don't just want a list of numbers; they need to know *percentage of total income spent* and *remaining budget cushion*.
- **No Mental Math**: The system must automatically deduct expenses, calculate net savings, compute utilization percentages, and identify the highest expenditure category.
- **Reliable Persistence**: Information must survive browser refreshes, device changes, and network blips without data loss.

### 4.3 Finora's Engineering Response
Finora directly incorporates these research insights into its architecture:
- **Instant Client-Side Filtering**: Filters operate instantly in memory over authenticated user transactions without lag.
- **Visual Feedback Loop**: Status badges change color dynamically:
  - `bg-emerald-400` for `< 80%` (Safe)
  - `bg-amber-400` for `80% - 100%` (Nearly Exhausted)
  - `bg-rose-500` for `> 100%` (Exceeded)
- **Zero-Trust Backend**: The backend ignores any client-supplied `userId` parameter and relies solely on verified JWT claims, eliminating cross-tenant privilege escalation vulnerabilities.

---

## 5. Entire Working of the Project (with Screenshots)

Here is a step-by-step walkthrough of the entire Finora system across all user journeys:

```
                                APPLICATION ARCHITECTURE WORKFLOW
 ┌────────────────┐         ┌────────────────┐         ┌────────────────┐         ┌────────────────┐
 │  Auth & Token  │ ──────> │   Dashboard    │ ──────> │  Transactions  │ ──────> │    Budgets     │
 │  Login/Register│         │  KPIs & Trends │         │ CRUD & Filters │         │ Limits & Alerts│
 └────────────────┘         └────────────────┘         └────────────────┘         └────────────────┘
         │                          ▲                          │                          │
         │                          │                          │                          │
         ▼                          └──────────────────────────┴──────────────────────────┘
   Bearer JWT Stored                       Real-time dynamic calculations & SVG Charts
```

---

### Step 1: User Authentication & Security

![Authentication Screen](screenshots/01-auth.png)
![Authentication Screen](screenshots/02-auth.png)
#### How It Works:
1. **Registration**:
   - The user inputs their `Full Name`, `Email Address`, and `Password` (minimum 6 characters).
   - The backend validates the email format via regular expressions and verifies uniqueness.
   - The password is encrypted using `bcrypt.hash(password, 10)` before storage.
   - A signed JWT token containing the user's ObjectId is generated and returned.
2. **Login & Session Storage**:
   - The user inputs credentials; bcrypt verifies the password hash against MongoDB.
   - Upon success, the JWT token is stored securely in browser `localStorage` under `finora_token`.
3. **Session Auto-Restoration**:
   - When the user returns or refreshes the page, `App.jsx` automatically sends the token to `/api/auth/me`.
   - The user's profile is validated, and their transactions and budgets are fetched immediately.
4. **Session Expiry Protection**:
   - If a token expires (24-hour lifetime), the API client intercepts the `401 Unauthorized` status, wipes the token, and emits a `finora_session_expired` event, cleanly returning the user to the login screen with an informative message.

---

### Step 2: Financial Overview & Executive Dashboard
![Financial Dashboard](screenshots/03-dashboard.png)

#### How It Works:
1. **Dynamic KPI Summary**:
   - **Total Balance**: Real-time sum of all income transactions minus all expense transactions.
   - **Total Income**: Cumulative income received.
   - **Total Expenses**: Cumulative money spent.
2. **Global Smart Alert System**:
   - If any category budget for the active month is nearing capacity ($\ge 80\%$) or exceeded ($> 100\%$), a prominent **Top Alert Banner** renders immediately below the header.
   - The banner identifies the offending category and exact over-budget amount, with a direct link to the Budgets tab.
3. **Month-at-a-Glance Panel**:
   - Shows current month net cash flow, inflow, outflow, and savings rate percentage progress bar.
4. **Recent Transactions Preview**:
   - Quick table listing the latest 5 transactions with initials badge, formatted currency in Indian Rupees (`₹`), and category tags.

---

### Step 3: Transaction Records & Multi-Criteria Filtering
![Transactions Management & Filters](screenshots/04-transactions.png)

#### How It Works:
1. **Adding a Transaction**:
   - Clicking **"Add Transaction"** opens a modal with fields: `Title`, `Amount (₹)`, `Type (Income/Expense)`, `Category`, `Date`, and optional `Note`.
   - On submission, the backend validates positive numeric values (`amount > 0`) and required strings before saving to MongoDB under `req.userId`.
2. **Editing & Deleting**:
   - Users can edit any transaction to correct amounts, dates, or categories.
   - Deletion includes a confirmation prompt and updates all dashboard balances instantly.
3. **Multi-Criteria Filtering Toolbar**:
   - **Text Search**: Real-time substring matching across transaction `title` and `note` (e.g. typing *"bistro"* finds the dinner receipt).
   - **Type Filtering**: Toggle between *All Types*, *Income Only (+)*, and *Expense Only (-)*.
   - **Category Filtering**: Dropdown dynamically populated with categories present in the user's data.
   - **Date Range Picker**: Filter entries between start and end dates with day-boundary precision.
   - **Active Filter Pills & Reset**: Applied filters display as removable badges with a one-click **"Reset Filters"** action.

---

### Step 4: Budget Management & Overspending Warnings
![Budget Management](screenshots/05-budgets.png)

#### How It Works:
1. **Setting a Monthly Budget**:
   - Users select a category (e.g. *Food & Dining*, *Housing*, *Transportation*, or custom text), enter a monthly spending limit (₹), and choose the target month (`YYYY-MM`).
   - Saved in MongoDB with a compound unique index `{ user, category, month }`.
2. **Real-Time Spent Calculation**:
   - The system queries all `expense` transactions matching that category and month.
   - Computes: $\text{Spent}$, $\text{Remaining} = \text{Limit} - \text{Spent}$, and $\text{Percentage} = (\text{Spent} / \text{Limit}) \times 100$.
3. **Graduated Warning Thresholds**:
   - 🟢 **On Track (< 80%)**: Emerald progress bar with an "On Track" badge.
   - 🟡 **Nearly Exhausted (80% – 100%)**: Amber progress bar with warning icon and notification banner.
   - 🔴 **Exceeded (> 100%)**: Rose/Red progress bar displaying the exact overage (e.g. *Over by ₹2,000 (120%)*).
4. **Cross-Month Inspection**:
   - A native month picker lets users plan future budgets or review historical performance month by month.

---

### Step 5: Analytics, Cash Flow Trends & Category Breakdown

![Analytics and Visual Trends](screenshots/06-analytics.png)

#### How It Works:
1. **Monthly Comparison Grouped Bar Chart**:
   - Groups user transactions chronologically across all recorded months.
   - Renders side-by-side SVG bars: Emerald for Income and Rose for Expense.
   - Hovering over any month highlights that period and displays an inspection tooltip with exact Rupee figures and net savings.
2. **Category Expense Donut Chart**:
   - Aggregates expenses by category, sorting them from highest to lowest.
   - Dynamically calculates circumference offsets using SVG `stroke-dasharray`.
   - Hovering over a donut segment highlights the slice and displays the category name, amount, and percentage contribution at the center.
3. **Category Spending Ranking Table**:
   - Shows ranked expense categories (`#1`, `#2`, `#3`) to highlight major financial leaks.

---

## 6. Conclusion

**Finora** bridges the gap between complex, invasive banking software and fragile, unautomated spreadsheets. By uniting **React 19**, **Tailwind CSS v4**, **Node.js**, **Express**, and **MongoDB Atlas**, the application delivers a private, responsive, and visually intuitive financial tracking experience.

### Key Milestones Achieved:
1. **Security & Zero-Trust Reliability**: Fully protected with stateless JWT authentication, password salt hashing, and server-enforced user scoping on all queries.
2. **Zero-Dependency SVG Data Visualizations**: Custom, reactive vector charts built directly in React without third-party chart bloat or version conflicts.
3. **Comprehensive Real-Time Budgeting**: Dynamic 80% caution and 100% exceeded threshold warnings that update simultaneously with every transaction.
4. **Instant In-Memory Filtering**: Instant search and multi-criteria filters that work seamlessly with real user data.
5. **Production Quality**: Built with 0 linter warnings, 0 linter errors, a 1-second production build, and an automated 13-test backend test suite.

Finora stands as an exemplary, production-grade project suitable for developer portfolios, technical interviews, and real-world personal finance management.
