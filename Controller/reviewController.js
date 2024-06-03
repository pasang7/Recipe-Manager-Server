const Review = require('../Model/reviewModel');
const catchAsync = require('../utils/catchAsyncError');
const AppError = require('../utils/globalError');


exports.createReview = catchAsync(async (req,res,next)=>{
    //console.log('createReview');

    if(!req.body.recipe) req.body.recipe = req.body.recipeId;
    if(!req.body.user) req.body.user = req.user;

    const newReview = await Review.create(req.body);
    res.status(201).json({
        status:'success',
        review:newReview
    })
    if(!newReview){
        return next (new AppError(' Something went wrong while posting your review', 400))
    }
});


exports.getReview = catchAsync(async(req,res, next)=>{

    let filter = {}
    if(req.params.recipeId) filter = {recipe: req.params.recipeId}

    const reviews = await Review.find(filter);

    res.status(200).json({
        status:'success',
        number:reviews.length,
        data:reviews
    })
})
