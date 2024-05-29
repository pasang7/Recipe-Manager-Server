const Category = require('../Model/categoryModel');
const catchAsync = require('../utils/catchAsyncError');
const AppError = require('../utils/globalError');


exports.createCategory = catchAsync(async (req,res,next)=>{
    console.log('cate');

    const newCat = await Category.create(req.body);
    res.status(201).json({
        status:'success',
        category:newCat
    })
    if(!newCat){
        return next (new AppError(' Something went wrong while creating your category', 400))
    }
});


exports.getCategories = catchAsync(async(req,res, next)=>{
    const categories = await Category.find();

    res.status(200).json({
        status:'success',
        number:categories.length,
        categories:categories
    })
})

exports.getSingleCategory = catchAsync(async (req, res,next)=>{
    const oneCat= await Category.findById(req.params.id);
    if(!oneCat){
      return next (new AppError(`Provided id ${req.params.id} is not found (or doesnt exist)`, 404));
    }

    res.status(200).json({
        status:'Success',
        category:oneCat
    })


})

exports.updateCategory = catchAsync(async (req, res,next)=>{
    let upCat= await Category.findById(req.params.id);
    if(!upCat){
      return next (new AppError(`Provided id ${req.params.id} is not found (or doesnt exist)`, 404));
    }
   upCat = await Category.findByIdAndUpdate(req.params.id, req.body, {
        new: true, // Return the modified document rather than the original.
        runValidators: true // Ensure validators defined in the Schema are run.
    });


    res.status(200).json({
        status:'Success',
        category:upCat
    })


})

exports.deleteCategory = catchAsync(async (req, res,next)=>{
    let delCat= await Category.findById(req.params.id);
    if(!delCat){
      return next (new AppError(`Provided id ${req.params.id} is not found (or doesnt exist)`, 404));
    }
    delCat = await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
        status:'Success',
        message:'Successfully deleted!!!!!'
    })
})
