const express = require('express');
const adminController = require('../controllers/adminController');
const { checkAdminSession } = require('../middleware/auth');

const router = express.Router();

// Routes
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);
router.get('/check-auth', adminController.checkAuth);

module.exports = router;
