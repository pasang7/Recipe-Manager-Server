const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, 'Please specify ingredient name'],
        unique:true
    },
    CreatedAt:{
        type:Date,
        default:Date.now
    }
});

const Ingredient= mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;