const bcrypt = require('bcryptjs');
const pool = require('../config/database');

class AdminController {
  // Admin Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: 0,
          message: 'Email and password are required'
        });
      }

      // Find admin
      const result = await pool.query(
        'SELECT id, name, email, password FROM adminLogin WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          status: 0,
          message: 'Invalid credentials'
        });
      }

      const admin = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return res.status(401).json({
          status: 0,
          message: 'Invalid credentials'
        });
      }

      // Create admin session
      req.session.admin_id = admin.id;
      req.session.admin_name = admin.name;
      req.session.admin_email = admin.email;

      res.json({
        status: 1,
        message: 'Login successful',
        data: {
          id: admin.id,
          name: admin.name,
          email: admin.email
        }
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        status: 0,
        message: 'Database error: ' + error.message
      });
    }
  }

  // Check Admin Authentication
  async checkAuth(req, res) {
    try {
      if (req.session && req.session.admin_id) {
        res.json({
          status: 1,
          message: 'Authenticated',
          data: {
            id: req.session.admin_id,
            name: req.session.admin_name,
            email: req.session.admin_email
          }
        });
      } else {
        res.status(401).json({
          status: 0,
          message: 'Not authenticated'
        });
      }
    } catch (error) {
      console.error('Check auth error:', error);
      res.status(500).json({
        status: 0,
        message: 'Authentication check failed'
      });
    }
  }

  // Admin Logout
  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({
            status: 0,
            message: 'Logout failed'
          });
        }

        res.clearCookie('connect.sid');
        res.json({
          status: 1,
          message: 'Logged out successfully'
        });
      });
    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({
        status: 0,
        message: 'Logout failed'
      });
    }
  }
}

module.exports = new AdminController();
