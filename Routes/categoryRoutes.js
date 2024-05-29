const express= require('express');
const categoryController= require('../Controller/categoryController');
const authController = require('../Controller/authController');

const router = express.Router();
router.route('/')
.get(categoryController.getCategories)
.post(authController.protectRoute, authController.authorizationRoutes('admin'), categoryController.createCategory);

router.route('/:id')
.patch(authController.protectRoute, authController.authorizationRoutes('admin'), categoryController.updateCategory)
.delete(authController.protectRoute, authController.authorizationRoutes('admin'), categoryController.updateCategory)
.get(categoryController.getSingleCategory)


module.exports = router; 