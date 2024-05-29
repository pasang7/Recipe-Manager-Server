const dotenv = require('dotenv');
dotenv.config({path:'./config/config.env'});

process.on('uncaughtException', err=>{
    console.log(err.name, err.message);
    process.exit(1);
})

const mongoose = require('mongoose');
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
 
mongoose.connect(DB).then(()=>{
    console.log('DB connection successful');
})

const port = process.env.PORT||8000;

const server = app.listen(port, ()=>{
    console.log(`App running on port ${port} and on ${process.env.NODE_ENV} mode`)
}); 

process.on('unhandledRejection', err =>{
    console.log(err.name, err.message);
    server.close(()=>{
        process.exit(1);
    })
})