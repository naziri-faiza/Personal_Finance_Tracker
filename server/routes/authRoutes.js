const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/pgPool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }
    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).toLowerCase().trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    // Check existing user
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertRes = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [trimmedName, normalizedEmail, hashedPassword]
    );
    const user = insertRes.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// Login existing user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const normalizedEmail = String(email).toLowerCase().trim();
    const userRes = await pool.query('SELECT id, name, email, password FROM users WHERE email = $1', [normalizedEmail]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const user = userRes.rows[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Get current user profile (protected)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.userId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = userRes.rows[0];
    return res.status(200).json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('Get user profile error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
