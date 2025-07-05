const pool = require('../config/database');
const path = require('path');

class ProductController {
  // Get all products
  async getAllProducts(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM products ORDER BY created_at DESC'
      );

      res.json({
        status: 1,
        data: result.rows,
        message: 'Products retrieved successfully'
      });

    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        status: 0,
        data: [],
        message: 'Database product retrieval failed: ' + error.message
      });
    }
  }

  // Get products by IDs
  async getProductsByIds(req, res) {
    try {
      const { productIds } = req.body;

      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({
          status: 0,
          error: 'Product IDs array is required'
        });
      }

      const placeholders = productIds.map((_, index) => `$${index + 1}`).join(',');
      const result = await pool.query(
        `SELECT * FROM products WHERE id IN (${placeholders})`,
        productIds
      );

      res.json({
        status: 1,
        products: result.rows
      });

    } catch (error) {
      console.error('Get products by IDs error:', error);
      res.status(500).json({
        status: 0,
        error: 'Database error: ' + error.message
      });
    }
  }

  // Create new product
  async createProduct(req, res) {
    try {
      const {
        name,
        description,
        price,
        stock_quantity = 0,
        category = 'makhana',
        discount_price
      } = req.body;

      // Validation
      if (!name || !price) {
        return res.status(400).json({
          status: 0,
          message: 'Name and price are required'
        });
      }

      // Handle image upload
      let imagePath = '';
      if (req.file) {
        imagePath = 'uploads/' + req.file.filename;
      }

      // Build dynamic INSERT query
      const columns = ['name', 'description', 'price', 'stock_quantity', 'category', 'image'];
      const values = [name, description, price, stock_quantity, category, imagePath];
      const placeholders = values.map((_, index) => `$${index + 1}`);

      if (discount_price !== undefined && discount_price !== null && discount_price !== '') {
        columns.push('discount_price');
        values.push(Math.round(discount_price));
        placeholders.push(`$${values.length}`);
      }

      const query = `INSERT INTO products (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
      const result = await pool.query(query, values);

      res.json({
        status: 1,
        message: 'Product added successfully',
        id: result.rows[0].id,
        image: imagePath
      });

    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({
        status: 0,
        message: 'Product insertion failed: ' + error.message
      });
    }
  }

  // Update product
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        price,
        stock_quantity,
        category,
        discount_price
      } = req.body;

      // Check if product exists
      const existingProduct = await pool.query(
        'SELECT id, image FROM products WHERE id = $1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          status: 0,
          message: 'Product not found'
        });
      }

      // Handle image upload
      let imagePath = existingProduct.rows[0].image;
      if (req.file) {
        imagePath = 'uploads/' + req.file.filename;
      }

      // Build dynamic UPDATE query
      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      if (name) {
        updateFields.push(`name = $${paramIndex++}`);
        params.push(name);
      }

      if (description) {
        updateFields.push(`description = $${paramIndex++}`);
        params.push(description);
      }

      if (price) {
        updateFields.push(`price = $${paramIndex++}`);
        params.push(price);
      }

      if (stock_quantity !== undefined) {
        updateFields.push(`stock_quantity = $${paramIndex++}`);
        params.push(stock_quantity);
      }

      if (category) {
        updateFields.push(`category = $${paramIndex++}`);
        params.push(category);
      }

      if (req.file) {
        updateFields.push(`image = $${paramIndex++}`);
        params.push(imagePath);
      }

      if (discount_price !== undefined && discount_price !== null && discount_price !== '') {
        updateFields.push(`discount_price = $${paramIndex++}`);
        params.push(Math.round(discount_price));
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          status: 0,
          message: 'No fields provided for update'
        });
      }

      params.push(id); // WHERE clause parameter
      const query = `UPDATE products SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`;

      await pool.query(query, params);

      res.json({
        status: 1,
        message: 'Product updated successfully'
      });

    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({
        status: 0,
        message: 'Product update failed: ' + error.message
      });
    }
  }

  // Delete product
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          status: 0,
          message: 'Product ID is required'
        });
      }

      // Check if product exists
      const existingProduct = await pool.query(
        'SELECT id FROM products WHERE id = $1',
        [id]
      );

      if (existingProduct.rows.length === 0) {
        return res.status(404).json({
          status: 0,
          message: 'Product not found'
        });
      }

      // Delete product
      await pool.query('DELETE FROM products WHERE id = $1', [id]);

      res.json({
        status: 1,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({
        status: 0,
        message: 'Product deletion failed: ' + error.message
      });
    }
  }
}

module.exports = new ProductController();
