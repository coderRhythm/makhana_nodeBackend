const express = require('express');
const productController = require('../controllers/productController');
const upload = require('../middleware/upload');

const router = express.Router();

// Routes
router.get('/', productController.getAllProducts);
router.post('/find', productController.getProductsByIds);
router.post('/', upload.single('image'), productController.createProduct);
router.put('/:id', upload.single('image'), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
