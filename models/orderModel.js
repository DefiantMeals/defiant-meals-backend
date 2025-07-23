const pool = require('../config/db');

// Get all orders
const getAllOrders = async () => {
  const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return result.rows;
};

// Create a new order
const createOrder = async (orderData) => {
  const { customer_name, item_name, quantity } = orderData;
  const result = await pool.query(
    'INSERT INTO orders (customer_name, item_name, quantity) VALUES ($1, $2, $3) RETURNING *',
    [customer_name, item_name, quantity]
  );
  return result.rows[0];
};

module.exports = {
  getAllOrders,
  createOrder,
};
