const mongoose = require('mongoose');
const Recipe = require('./recipeModel');

const reviewSchema = new mongoose.Schema({

    review:{
        type:String,
        required:[true, 'Review is required']
    },

    rating:{
        type:Number,
        min:1,
        max:5
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    recipe:{
        type:mongoose.Schema.ObjectId,
        ref:'Recipe',
        required:[true, 'Review must belong to the recipe']
    },
    user:{
        type:mongoose.Schema.ObjectId,
        ref:'User',
        required:[true, 'Only logged in user can add reviews']
    } 
},
{
    toJSON:{virtuals: true},
    toObject:{virtuals:true}

});


reviewSchema.statics.calcAverageRating = async function(recipeId){
    const stat = await this.aggregate([
        {
            $match:{recipe: recipeId}
        },
        {
       $group: {
                _id:'$recipe',
                nRating:{ $sum:1},
                avgRating:{$avg :'$rating'}
            }
        }

    ])

   await Recipe.findByIdAndUpdate(recipeId, {
        numberOfRatings:stat[0].nRating,
        averageRating:stat[1].avgRating
    })
}


reviewSchema.post('save', function(){

    this.constructor.calcAverageRating(this.recipe);
})

reviewSchema.pre(/^find/, function (next){
this.populate({
    path:'recipe',
    select:'title featuredImage'
}).populate({
    path:'user',
    select: 'username userImage'
})
    next()
})


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;