const express = require('express');

const recipeController= require('../Controller/recipeController');
const reviewRouter = require('../Routes/reviewRoutes');
const authController = require('../Controller/authController');
const router = express.Router();

router.route('/top-5-recipe').get(recipeController.top5recipe, recipeController.getAllRecipe);

router.get('/top-favorites', recipeController.getTopFavoriteRecipes);

router.use('/:recipeId/reviews', reviewRouter);

router.route('/')
.get(recipeController.getAllRecipe)
.post(authController.protectRoute, 
    recipeController.uploadRecipeImage, 
    recipeController.resizeRecipeImage, 
    recipeController.generateRecipe);

router.route('/:id')
.patch(recipeController.uploadRecipeImage, 
    recipeController.resizeRecipeImage, 
    recipeController.updateRecipe)
.delete(recipeController.removeRecipe)
.get(recipeController.getSingleRecipe);

router.route('/:recipeId/favorite').patch(recipeController.markAsFavorite);
router.route('/favorites/:userId').get(recipeController.getUserFavorites);

router.route('/myrecipe/:userId').get(recipeController.getUserRecipes);


router.route('/images/:filename').get(recipeController.getRecipeImage);


module.exports = router;