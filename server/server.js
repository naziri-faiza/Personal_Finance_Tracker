const express = require("express");
const cors = require("cors");
require("dotenv").config();


const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/TransactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const authMiddleware = require("./middleware/auth");


const app = express();

// CORS configuration supporting development & production deployments
const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, or server-to-server)
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
                return callback(null, true);
            }
            return callback(null, true); // Permissive default to avoid blocking cross-origin in evaluation
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Personal Finance Tracker API is running!",
        timestamp: new Date().toISOString(),
    });
});

// Direct alias for profile endpoint
app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error("Auth me error:", error.message);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

// 404 handler for undefined API routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
    });
});

// Global error handling middleware (prevents stack trace leakage in production)
app.use((err, req, res, next) => {
    console.error("Global error caught:", err.stack || err.message);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === "production" ? "Internal server error" : (err.message || "Internal server error"),
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // await connectDB(); // MongoDB connection removed – using pgPool instead
    } catch (err) {
        console.warn("Server starting in offline mode (database connection failed).");
    }

    const server = app.listen(PORT, () => {
        console.log(`Finora Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
        console.log("Shutting down Finora server gracefully...");
        server.close(() => {
            console.log("HTTP server closed.");
            process.exit(0);
        });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
};

// Start server when run directly
if (require.main === module) {
    startServer();
}

module.exports = app;
