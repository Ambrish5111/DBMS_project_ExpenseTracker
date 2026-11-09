import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import cors from '@fastify/cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

await fastify.register(cors);
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

// 1. API: Get initial user and categories
fastify.get('/api/bootstrap', async (request, reply) => {
  const userRes = await pool.query('SELECT * FROM users LIMIT 1');
  const catRes = await pool.query('SELECT * FROM categories ORDER BY name ASC');
  return { user: userRes.rows[0], categories: catRes.rows };
});

// 2. API: Get expenses list with category join
fastify.get('/api/expenses', async (request, reply) => {
  const query = `
    SELECT e.expense_id, e.title, e.amount, e.expense_date, c.name AS category
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    ORDER BY e.expense_date DESC, e.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
});

// 3. API: Add a new expense (Triggers balance update automatically)
fastify.post('/api/expenses', async (request, reply) => {
  const { userId, categoryId, title, amount, expenseDate } = request.body;
  
  const query = `
    INSERT INTO expenses (user_id, category_id, title, amount, expense_date)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [userId, categoryId, title, amount, expenseDate || new Date()];
  const result = await pool.query(query, values);

  // Fetch updated balances
  const userRes = await pool.query(
    'SELECT initial_balance, total_balance FROM users WHERE user_id = $1',
    [userId]
  );
  
  return { 
    expense: result.rows[0], 
    initialBalance: userRes.rows[0].initial_balance,
    updatedBalance: userRes.rows[0].total_balance 
  };
});

// 4. API: Category Breakdown (DBMS Aggregation: GROUP BY)
fastify.get('/api/stats', async (request, reply) => {
  const query = `
    SELECT c.name AS category, SUM(e.amount) AS total
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    GROUP BY c.name
    ORDER BY total DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Expense Tracker running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();