const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { checkSession } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const signupValidation = [
  body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').optional().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters')
];

const loginValidation = [
  body('username').notEmpty().withMessage('Username/Email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes
router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/logout', authController.logout);
router.get('/check-session', authController.checkSession);
router.get('/profile/:userId', authController.getProfileData);
router.put('/profile', checkSession, authController.updateProfile);

module.exports = router;
