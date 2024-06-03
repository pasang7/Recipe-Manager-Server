const express = require ('express');
const morgan = require('morgan');
const GlobalError = require('./utils/globalError');
const errorHandler = require('./Controller/errorController');
// const rateLimit = require('express-rate-limit');
// const helmet = require('helmet');
// const mongoSanitize= require('express-mongo-sanitize');
// const xss = require('xss-clean');
// const hpp = require('hpp');
// const csurf = require('csurf');

const app = express();
//app.use(helmet());

// const limiter = rateLimit({
//     max:100,
//     windowMs:60*60*1000,
//     message:'Too many request from this IP. Please try an hour later'
// })

//app.use('/api', limiter);
app.use(express.json());

// //

const userRoute = require('./Routes/userRoutes');
const recipeRoute = require('./Routes/recipeRoute');
const reviewRoute = require('./Routes/reviewRoutes');
const categoryRoute = require('./Routes/categoryRoutes');


if (process.env.NODE_ENV ==='development'){
    app.use(morgan('dev'));
} else {
    // console.log = function () {}
}

app.use('/api/v1/user', userRoute);
app.use('/api/v1/recipe', recipeRoute);
app.use('/api/v1/reviews', reviewRoute);
app.use('/api/v1/categories', categoryRoute);


app.all('*', (req, res, next)=>{
    next(new GlobalError(`This ${req.originalUrl} link is not defined on this server`, 404));
})
app.use(errorHandler);
module.exports=app;
