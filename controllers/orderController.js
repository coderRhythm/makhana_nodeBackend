const pool = require('../config/database');

class OrderController {
  // Get orders
  async getOrders(req, res) {
    try {
      const { user_id } = req.query;
      let query, params = [];

      if (user_id) {
        query = `
          SELECT o.*,
          STRING_AGG(
            CONCAT(oi.product_id, ':', oi.quantity, ':', oi.price, ':', p.name), '|'
          ) as order_items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE o.user_id = $1
          GROUP BY o.id
          ORDER BY o.created_at DESC
        `;
        params = [user_id];
      } else {
        query = `
          SELECT o.*,
          STRING_AGG(
            CONCAT(oi.product_id, ':', oi.quantity, ':', oi.price, ':', p.name), '|'
          ) as order_items
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          LEFT JOIN products p ON oi.product_id = p.id
          GROUP BY o.id
          ORDER BY o.created_at DESC
        `;
      }

      const result = await pool.query(query, params);
      const orders = result.rows;

      // Process order items
      orders.forEach(order => {
        if (order.order_items) {
          const items = order.order_items.split('|');
          order.items = [];
          
          items.forEach(item => {
            const parts = item.split(':');
            if (parts.length >= 4) {
              order.items.push({
                product_id: parts[0],
                quantity: parts[1],
                price: parts[2],
                product_name: parts[3]
              });
            }
          });
        }
        delete order.order_items;
      });

      res.json(orders);

    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        status: 0,
        message: 'Database order retrieval failed: ' + error.message
      });
    }
  }

  // Create order
  async createOrder(req, res) {
    const client = await pool.connect();
    
    try {
      const { user_id, total_amount, shipping_address, items } = req.body;

      if (!user_id || !total_amount || !items || items.length === 0) {
        return res.status(400).json({
          status: 0,
          message: 'Missing required fields: user_id, total_amount, or items'
        });
      }

      await client.query('BEGIN');

      // Insert order
      const orderResult = await client.query(
        `INSERT INTO orders (user_id, total_amount, shipping_address, status, created_at) 
         VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP) 
         RETURNING id`,
        [user_id, total_amount, shipping_address]
      );

      const orderId = orderResult.rows[0].id;

      // Insert order items and update stock
      for (const item of items) {
        const productId = item.product_id || item.id;
        const quantity = item.quantity || 1;
        const price = item.price || 0;

        if (!productId || !quantity || !price) {
          throw new Error('Invalid item data');
        }

        // Insert order item
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
          [orderId, productId, quantity, price]
        );

        // Update product stock
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [quantity, productId]
        );
      }

      await client.query('COMMIT');

      res.json({
        status: 1,
        message: 'Order created successfully',
        order_id: orderId
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Create order error:', error);
      res.status(500).json({
        status: 0,
        message: 'Order creation failed: ' + error.message
      });
    } finally {
      client.release();
    }
  }

  // Update order status
  async updateOrderStatus(req, res) {
    try {
      const { order_id, status } = req.body;

      if (!order_id || !status) {
        return res.status(400).json({
          status: 0,
          message: 'Missing order_id or status'
        });
      }

      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 0,
          message: 'Invalid status'
        });
      }

      const result = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [status, order_id]
      );

      if (result.rowCount > 0) {
        res.json({
          status: 1,
          message: 'Order status updated successfully'
        });
      } else {
        res.status(404).json({
          status: 0,
          message: 'Order not found'
        });
      }

    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({
        status: 0,
        message: 'Order update failed: ' + error.message
      });
    }
  }
}

module.exports = new OrderController();
