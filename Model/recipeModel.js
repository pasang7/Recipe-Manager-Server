const mongoose = require('mongoose');
const recipeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Recipe must have a title']
    },
    description: {
        type: String,
        required: [true, 'Recipe must have a description']
    },
    instructions:{
        type: String,
        required: [true, 'Recipe must have a instruction']
    },

    averageRating:{
        type:Number,
        default:0

    },

    numberOfRatings:{
type:Number,
default:0
    },
    
    images: {
        type: [String]
    },
    featuredImgURL: {
        type: String
    },
    imagesURL: {
        type: [String]
    },
    prep_time: {
        type: Number,
    },
    cookingTime: {
        type: Number,
        required: [true, 'Please specify cooking time']
    },

    timeToComplete:{
        type:Number, // no need to be added from front end calculated automatically (helps to search and filter)

    },
    cookingTemp: {
        type: Number,
    },


    ingredients: [String],

    cost_per_serve: {
        type: Number
    },
    category: {
        type:mongoose.Schema.ObjectId,
        ref: 'Category',
    },
    difficulty:{
        type:String,
        enum:['easy', 'medium', 'hard', 'pro']
        //difficulty  will implement some logic to auto complete this field too (for search and filteration and creating quick links)

    },

    tags:{
        type:[String] // can be anything like spicy asian traditional asthetic cusine desserts dinner meal anything

    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    contentTime:{
        type:Number // auto filled but can be used in frontend to show how long it take to read about the article

    },
    createdBy: {
        type:mongoose.Schema.ObjectId,
        ref:'User'
    },
    favoritedBy: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }]

}, 
{
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
});

recipeSchema.pre('save', function (next){
this.timeToComplete = this.cookingTime + this.prep_time; // calculating total time
next();
})

//Virtual populate 
recipeSchema.virtual('reviews', {
    ref:'Review',
    foreignField: 'recipe',
    localField: '_id'
})

recipeSchema.pre('save', async function(next){
   const averageSpeed = 200;
   const word1 = await this.description.length + this.instructions.length+ this.title.length;

    this.contentTime = Math.ceil(word1/averageSpeed); // calculating time to read articles
    next();
})
const Recipe = mongoose.model('Recipe', recipeSchema);

module.exports = Recipe;