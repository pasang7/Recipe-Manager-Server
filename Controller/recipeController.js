const Recipe = require('../Model/recipeModel');
const sharp = require('sharp');
const path = require('path');
const APIFeatures= require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsyncError');
const AppError = require('../utils/globalError');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(
            new GlobalError("Invalid file type. Please upload image only", 400),
            false
        );
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

//multiple file for image array in recipes minimum of 1 file to maximum of 3
exports.uploadRecipeImage = upload.fields([
    {name:'featuredImage', maxCount:1},
    {name:'images', maxCount:3}
])

exports.resizeRecipeImage = catchAsync(async (req, res, next) => {
    try {
        if (req.files.featuredImage) {
          const featuredImageFilename = `${uuidv4()}-cover.jpeg`;
    
          await sharp(req.files.featuredImage[0].buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`public/images/recipes/${featuredImageFilename}`);
    
        //   req.body.featuredImage = featuredImageFilename;
          req.body.featuredImgURL = featuredImageFilename;
        }
    
        if (req.files.images) {
          req.body.imagesURL = [];
          await Promise.all(
            req.files.images.map(async (file, i) => {
              const filename = `${uuidv4()}-${i + 1}.jpeg`;
              await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/images/recipes/${filename}`);
    
              req.body.imagesURL.push(filename);
            })
          );
        }
    
        next();
      } catch (error) {
        console.error(error);
        return next(error);
      }
});

exports.getRecipeImage = catchAsync(async (req, res) => {
    // console.log(req.params.filename, "getImage");
    try {
        const filename = req.params.filename;
        const imagePath = path.join(__dirname, '../public/images/recipes', filename);

        res.sendFile(imagePath, (err) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.error("File not found:", imagePath);
                    res.status(404).json({
                        status: 'fail',
                        message: 'File not found'
                    });
                } else {
                    console.error("Error sending file:", err);
                    res.status(500).json({
                        status: 'fail',
                        message: 'An internal server error occurred'
                    });
                }
            }
        });
    } catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({
            status: 'fail',
            message: 'An internal server error occurred'
        });
    }
    
});


exports.top5recipe = (req, res, next)=>{
    req.query.limit='5';
    req.query.sort='-cookingTime, avgRating';
    req.query.fields='title, description, steps, productionCost',
    next();
}

exports.getTopFavoriteRecipes = catchAsync(async (req, res, next) => {
    try {
        const topFavoriteRecipes = await Recipe.aggregate([
            { $unwind: "$favoritedBy" },  // Unwind the favoritedBy array
            { $group: {
                _id: "$_id",
                title: { $first: "$title" },
                description: { $first: "$description" },
                featuredImgURL: { $first: "$featuredImgURL" },
                numberOfFavorites: { $sum: 1 }  // Count the number of times each recipe is favorited
            }},
            { $sort: { numberOfFavorites: -1 } },  // Sort by number of favorites in descending order
            { $limit: 10 }  // Limit to top 10 recipes
        ]);

        res.status(200).json({
            status: 'success',
            results: topFavoriteRecipes.length,
            data: topFavoriteRecipes
        });
    } catch (err) {
        console.error(err);
        return next(new AppError('Error retrieving top favorite recipes', 500));
    }
});

exports.getAllRecipe = catchAsync(async (req, res, next)=>{
    try {
        const features = new APIFeatures(Recipe.find().populate('category'), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
        const allRecipe = await features.query;
        // console.log(allRecipe);
        res.status(200).json({
            status:'success',
            recipes: allRecipe
        })
    } catch (err) {
        console.error(err);
    }
})

exports.markAsFavorite = catchAsync(async (req, res) => {
    try {
        const { recipeId } = req.params;
        const userId = req.query.userId;

       
        const recipe = await Recipe.findById(recipeId);
        if (!recipe) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        if (!recipe.favoritedBy.includes(userId)) {
            recipe.favoritedBy.push(userId);
            await recipe.save();
            return res.status(200).json({ message: 'Marked as favorite' });
        } else {
            recipe.favoritedBy = recipe.favoritedBy.filter(id => !id.equals(userId));
            await recipe.save();
            return res.status(200).json({ message: 'Unmarked as favorite' });
        }
    } catch (error) {
        console.error('Error marking recipe as favorite:', error);
        return res.status(500).json({ message: 'Error marking recipe as favorite' });
    }
});

exports.getUserFavorites = async (req, res, next) => {
    // console.log('getUserFavorites');
    try {
        const { userId } = req.params;

        // Find recipes where the userId exists in the 'favoritedBy' array
        const favoriteRecipes = await Recipe.find({ favoritedBy: userId });

        res.status(200).json({
            status: 'success',
            results: favoriteRecipes.length,
            recipes: favoriteRecipes
        });
    } catch (err) {
        console.error(err);
    }
    
};

exports.getUserRecipes = async (req, res, next) => {
    try {
        const { userId } = req.params;

        // Find recipes where the 'createdBy' field equals the userId
        const userRecipes = await Recipe.find({ createdBy: userId });

        res.status(200).json({
            status: 'success',
            results: userRecipes.length,
            recipes: userRecipes
        });
    } catch (err) {
        console.error(err);
    }
};

exports.getSingleRecipe = catchAsync(async (req, res,next)=>{
        const oneRecipe = await Recipe.findById(req.params.id).populate('reviews');
        if(!oneRecipe){
          return next (new AppError(`Provided id ${req.params.id} is not found (or doesnt exist)`, 404));
        }

        res.status(200).json({
            status:'Success',
            recipe:oneRecipe
        })
   
})

exports.generateRecipe = catchAsync(async (req, res, next) => {
    console.log('Generating recipe', req.body);

    try {
        // Parse ingredients if it's a string (stringified JSON array)
        let ingredients = req.body?.ingredients;
        let parsedIngredients;
        if (typeof ingredients === 'string') {
            try {
                parsedIngredients = JSON.parse(ingredients);
            } catch (parseError) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Invalid format for ingredients. Must be a JSON array.'
                });
            }
        } else {
            parsedIngredients = ingredients;
        }

        console.log(parsedIngredients);
        // Add parsed ingredients to req.body
        req.body.ingredients = parsedIngredients;

        // Attempt to create the recipe
        const genRecipe = await Recipe.create(req.body);

        // Return a success response
        res.status(201).json({
            status: 'success',
            created_Recipe: genRecipe
        });
    } catch (error) {
        // Handle database or other errors
        console.error('Error generating recipe:', error);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while generating the recipe.'
        });
    }
});


exports.updateRecipe = catchAsync(async (req, res, next) => {
    // console.log('hit update recipie', req.body, req.params);
    // Find the recipe by ID. If not found, immediately return a 404 error to the client.
    const updateRecipe = await Recipe.findById(req.params.id);
    if (!updateRecipe) {
       return next (new AppError(` Recipe for provided ID: ${req.params.id} doesn't exist. Please check id before updating`, 404))
    }

     // Parse ingredients if it's a string (stringified JSON array)
     let parsedIngredients;
     let ingredients = req.body.ingredients;
     if (typeof ingredients === 'string') {
         try {
             parsedIngredients = JSON.parse(ingredients);
         } catch (parseError) {
            log.error(parseError);
             return res.status(400).json({
                 status: 'fail',
                 message: 'Invalid format for ingredients. Must be a JSON array.'
             });
         }
     } else {
         parsedIngredients = ingredients;
     }

     console.log(parsedIngredients);
     // Add parsed ingredients to req.body
     req.body.ingredients = parsedIngredients;

    // Update the recipe with the new data provided in the request body.
     const updatedRecipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
        $push: {
          imagesURL: {
            $each: req.body.imagesURL
          }
        }
      }, {
        new: true, // Return the modified document rather than the original.
        runValidators: true // Ensure validators defined in the Schema are run.
      });

    // If no document is updated, handle it as a server error (unlikely to occur if the above check passes).
    if (!updatedRecipe) {
     return next (new AppError(`Recipe with given ID: ${req.params.id} doesn't exist. Please check recipe ID` , 404))
    }

    // Return the updated recipe to the client.
    res.status(200).json({
        status: 'success',
        data: {
            recipe: updatedRecipe
        }
    });
});

// delete recipe from the server
exports.removeRecipe = catchAsync(async (req, res, next) => {
    // Try to find the recipe first
    const delRecipe = await Recipe.findById(req.params.id);

    // If no recipe is found, return a 404 error immediately and stop further execution
    if (!delRecipe) {
       return next (new AppError(`Recipe with given ID: ${req.params.id} doesn't exist. Please check recipe ID` , 404))
    }

    // If a recipe is found, proceed to delete it
    await Recipe.findByIdAndDelete(req.params.id);

    // Send a success response after deleting the recipe
    res.status(204).json({
        status: 'success',
        data: null // No need to send back any data
    });
});
