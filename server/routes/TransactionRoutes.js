const express = require('express');
const router = express.Router();
const pool = require('../config/pgPool');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

const parseAmount = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

// CREATE transaction
router.post('/', async (req, res) => {
  try {
    const { title, amount, type, category, date, note } = req.body;
    if (!title || !type || !category) {
      return res.status(400).json({ success: false, message: 'Title, type, and category are required' });
    }
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }
    const numericAmount = parseAmount(amount);
    if (numericAmount === null || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be income or expense' });
    }
    const insertQuery = `INSERT INTO transactions (user_id, title, amount, type, category, date, note)
                         VALUES ($1, $2, $3, $4, $5, $6, $7)
                         RETURNING id, user_id, title, amount, type, category, date, note, created_at`;
    const insertValues = [req.userId, title.trim(), numericAmount, type, category.trim(), date || new Date(), note ? note.trim() : null];
    const result = await pool.query(insertQuery, insertValues);
    const transaction = result.rows[0];
    return res.status(201).json({ success: true, message: 'Transaction created successfully', transaction });
  } catch (error) {
    console.error('Create transaction error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
});

// LIST transactions with filters
router.get('/', async (req, res) => {
  try {
    const { type, category, startDate, endDate, search } = req.query;
    const conditions = ['user_id = $1'];
    const values = [req.userId];
    let idx = 2;
    if (type && ['income', 'expense'].includes(type)) {
      conditions.push(`type = $${idx++}`);
      values.push(type);
    }
    if (category && category !== 'all') {
      conditions.push(`LOWER(category) = LOWER($${idx++})`);
      values.push(category.trim());
    }
    if (startDate) {
      conditions.push(`date >= $${idx++}`);
      values.push(startDate);
    }
    if (endDate) {
      conditions.push(`date <= $${idx++}`);
      values.push(endDate);
    }
    if (search && search.trim()) {
      const pattern = `%${search.trim().replace(/%/g, '\%').replace(/_/g, '\_')}%`;
      conditions.push(`(title ILIKE $${idx} OR note ILIKE $${idx} OR category ILIKE $${idx})`);
      values.push(pattern);
      idx++;
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT id, user_id, title, amount, type, category, date, note, created_at FROM transactions ${whereClause} ORDER BY date DESC, created_at DESC`;
    const result = await pool.query(query, values);
    return res.status(200).json({ success: true, count: result.rowCount, transactions: result.rows });
  } catch (error) {
    console.error('Get transactions error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// GET single transaction by id
router.get('/:id', async (req, res) => {
  try {
    const query = `SELECT id, user_id, title, amount, type, category, date, note, created_at FROM transactions WHERE id = $1 AND user_id = $2`;
    const result = await pool.query(query, [req.params.id, req.userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    return res.status(200).json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    console.error('Get transaction error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch transaction' });
  }
});

// UPDATE transaction
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, type, category, date, note } = req.body;
    // Build dynamic SET clause
    const setClauses = [];
    const values = [];
    let idx = 1;
    if (title !== undefined) {
      if (!title || !String(title).trim()) {
        return res.status(400).json({ success: false, message: 'Title cannot be empty' });
      }
      setClauses.push(`title = $${idx++}`);
      values.push(title.trim());
    }
    if (amount !== undefined) {
      const numericAmount = parseAmount(amount);
      if (numericAmount === null || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
      }
      setClauses.push(`amount = $${idx++}`);
      values.push(numericAmount);
    }
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ success: false, message: 'Type must be income or expense' });
      }
      setClauses.push(`type = $${idx++}`);
      values.push(type);
    }
    if (category !== undefined) {
      if (!category || !String(category).trim()) {
        return res.status(400).json({ success: false, message: 'Category cannot be empty' });
      }
      setClauses.push(`category = $${idx++}`);
      values.push(category.trim());
    }
    if (date !== undefined) {
      setClauses.push(`date = $${idx++}`);
      values.push(date);
    }
    if (note !== undefined) {
      setClauses.push(`note = $${idx++}`);
      values.push(note ? note.trim() : null);
    }
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }
    // Append id and user_id for WHERE clause
    values.push(req.params.id, req.userId);
    const query = `UPDATE transactions SET ${setClauses.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING id, user_id, title, amount, type, category, date, note, created_at`;
    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    return res.status(200).json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    console.error('Update transaction error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update transaction' });
  }
});

// DELETE transaction
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    return res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete transaction' });
  }
});

module.exports = router;
