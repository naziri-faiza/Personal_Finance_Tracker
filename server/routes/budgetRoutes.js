const express = require('express');
const router = express.Router();
const pool = require('../config/pgPool');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

const parseAmount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

// GET /api/budgets - List budgets for authenticated user, optional month filter
router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    const conditions = ['user_id = $1'];
    const values = [req.userId];
    let idx = 2;
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ success: false, message: 'Month must be in YYYY-MM format' });
      }
      conditions.push(`month = $${idx++}`);
      values.push(month);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT id, user_id, category, amount, month, created_at FROM budgets ${whereClause} ORDER BY created_at DESC`;
    const result = await pool.query(query, values);
    return res.status(200).json({ success: true, count: result.rowCount, budgets: result.rows });
  } catch (error) {
    console.error('Get budgets error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch budgets' });
  }
});

// GET /api/budgets/:id - Get a single budget
router.get('/:id', async (req, res) => {
  try {
    const query = `SELECT id, user_id, category, amount, month, created_at FROM budgets WHERE id = $1 AND user_id = $2`;
    const result = await pool.query(query, [req.params.id, req.userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    return res.status(200).json({ success: true, budget: result.rows[0] });
  } catch (error) {
    console.error('Get budget error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch budget' });
  }
});

// POST /api/budgets - Create or update (upsert) a budget for a month & category
router.post('/', async (req, res) => {
  try {
    const { category, amount, month } = req.body;
    if (!category || !String(category).trim()) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }
    const numericAmount = parseAmount(amount);
    if (numericAmount === null || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    const targetMonth = month ? String(month).trim() : new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return res.status(400).json({ success: false, message: 'Month must be in YYYY-MM format' });
    }
    const trimmedCategory = String(category).trim();
    // Upsert using INSERT ... ON CONFLICT
    const upsertQuery = `INSERT INTO budgets (user_id, category, amount, month)
                         VALUES ($1, $2, $3, $4)
                         ON CONFLICT (user_id, category, month) DO UPDATE SET amount = EXCLUDED.amount
                         RETURNING id, user_id, category, amount, month, created_at`;
    const result = await pool.query(upsertQuery, [req.userId, trimmedCategory, numericAmount, targetMonth]);
    const budget = result.rows[0];
    const statusCode = result.command === 'INSERT' ? 201 : 200;
    const message = result.command === 'INSERT' ? 'Budget created successfully' : 'Budget updated successfully';
    return res.status(statusCode).json({ success: true, message, budget });
  } catch (error) {
    console.error('Create/Update budget error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to save budget' });
  }
});

// PUT /api/budgets/:id - Update an existing budget (partial)
router.put('/:id', async (req, res) => {
  try {
    const { category, amount, month } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (category !== undefined) {
      if (!category || !String(category).trim()) {
        return res.status(400).json({ success: false, message: 'Category cannot be empty' });
      }
      fields.push(`category = $${idx++}`);
      values.push(String(category).trim());
    }
    if (amount !== undefined) {
      const numericAmount = parseAmount(amount);
      if (numericAmount === null || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
      }
      fields.push(`amount = $${idx++}`);
      values.push(numericAmount);
    }
    if (month !== undefined) {
      const targetMonth = String(month).trim();
      if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
        return res.status(400).json({ success: false, message: 'Month must be in YYYY-MM format' });
      }
      fields.push(`month = $${idx++}`);
      values.push(targetMonth);
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    // Add id and user_id for WHERE clause
    values.push(req.params.id, req.userId);
    const query = `UPDATE budgets SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING id, user_id, category, amount, month, created_at`;
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    return res.status(200).json({ success: true, message: 'Budget updated successfully', budget: result.rows[0] });
  } catch (error) {
    console.error('Update budget error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
});

// DELETE budget
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM budgets WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    return res.status(200).json({ success: true, message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete budget' });
  }
});

module.exports = router;
