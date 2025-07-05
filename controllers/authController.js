const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { validationResult } = require('express-validator');

class AuthController {
  // User Signup
  async signup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 0,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const {
        username,
        email,
        password,
        confirmPassword,
        fullName,
        phone,
        address
      } = req.body;

      // Check if passwords match
      if (password !== confirmPassword) {
        return res.status(400).json({
          status: 0,
          message: 'Passwords do not match'
        });
      }

      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          status: 0,
          message: 'Username or email already exists'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Insert new user
      const result = await pool.query(
        `INSERT INTO users (username, email, password_hash, full_name, phone, address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING id, username, email, full_name`,
        [username, email, passwordHash, fullName, phone, address]
      );

      const newUser = result.rows[0];

      // Create session
      req.session.user_id = newUser.id;
      req.session.username = newUser.username;
      req.session.email = newUser.email;
      req.session.full_name = newUser.full_name;
      req.session.logged_in = true;
      req.session.login_time = Date.now();

      res.status(201).json({
        status: 1,
        message: 'Account created successfully!',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          full_name: newUser.full_name
        },
        logged_in: true
      });

    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        status: 0,
        message: 'Database error occurred'
      });
    }
  }

  // User Login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          status: 0,
          message: 'Username/Email and password are required'
        });
      }

      // Find user
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          status: 0,
          message: 'Invalid username/email or password'
        });
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          status: 0,
          message: 'Invalid username/email or password'
        });
      }

      // Create session
      req.session.user_id = user.id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.full_name = user.full_name;
      req.session.logged_in = true;
      req.session.login_time = Date.now();

      res.json({
        status: 1,
        message: 'Login successful!',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name
        },
        logged_in: true
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        status: 0,
        message: 'Database error occurred'
      });
    }
  }

  // User Logout
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
          message: 'Logged out successfully',
          logged_in: false
        });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        status: 0,
        message: 'Logout failed'
      });
    }
  }

  // Check Session
  async checkSession(req, res) {
    try {
      if (req.session && req.session.logged_in && req.session.login_time) {
        const sessionAge = Date.now() - req.session.login_time;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (sessionAge < maxAge) {
          req.session.login_time = Date.now(); // Refresh session
          return res.json({
            status: 1,
            logged_in: true,
            user: {
              id: req.session.user_id,
              username: req.session.username,
              email: req.session.email,
              full_name: req.session.full_name
            }
          });
        }
      }

      req.session.destroy();
      res.json({
        status: 0,
        logged_in: false,
        message: 'Session expired'
      });

    } catch (error) {
      console.error('Session check error:', error);
      res.status(500).json({
        status: 0,
        logged_in: false,
        message: 'Session check failed'
      });
    }
  }

  // Get Profile Data
  async getProfileData(req, res) {
    try {
      const userId = req.params.userId || req.query.user_id;

      if (!userId) {
        return res.status(400).json({
          status: 0,
          message: 'User ID required'
        });
      }

      const result = await pool.query(
        'SELECT id, username, email, full_name, phone, address, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 0,
          message: 'User not found'
        });
      }

      res.json({
        status: 1,
        result: result.rows[0],
        message: 'User data retrieved successfully'
      });

    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        status: 0,
        message: 'Database error occurred'
      });
    }
  }

  // Update Profile
  async updateProfile(req, res) {
    try {
      if (!req.session.logged_in) {
        return res.status(401).json({
          status: 0,
          message: 'Not authenticated'
        });
      }

      const userId = req.session.user_id;
      const { full_name, phone, address, email } = req.body;

      // Validate email
      if (!email || !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({
          status: 0,
          message: 'Valid email is required'
        });
      }

      // Check if email is already in use by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(400).json({
          status: 0,
          message: 'Email already in use'
        });
      }

      // Update user profile
      const result = await pool.query(
        `UPDATE users 
         SET full_name = $1, phone = $2, address = $3, email = $4 
         WHERE id = $5 
         RETURNING id, username, email, full_name, phone, address`,
        [full_name, phone, address, email, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 0,
          message: 'User not found'
        });
      }

      // Update session
      req.session.full_name = full_name;
      req.session.phone = phone;
      req.session.address = address;
      req.session.email = email;

      res.json({
        status: 1,
        message: 'Profile updated successfully',
        user: result.rows[0]
      });

    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        status: 0,
        message: 'Database error occurred'
      });
    }
  }
}

module.exports = new AuthController();
