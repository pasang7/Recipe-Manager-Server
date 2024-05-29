const AppError = require('../utils/globalError');

const handleDBError = err=>{
    const message =`Invalid ${err.path}  : ${err.value}`;
    console.log(message);
    return new AppError(message, 400);
}

const handleDuplicateDB = err=>{
    const value = err.errmsg.match(/(["'])(?:\\.|[^\\])*?\1/)[0]
    const message = ` Duplicate fields value ${value}. Please use different value`;
    return new AppError(message, 400);
}

const handleValidationDB =err=>{
    const errors = Object.values(err.errors).map(el=>el.message)
    const message =` Invalid user inputs. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

const devErrorResponse = (err, res)=>{
    res.status(err.statusCode).json({
        status:err.status,
        message:err.message,
        error:err,
        stack:err.stack
    })
}

const prodErrorResponse = (err, res)=>{
    if(err.isOperational){

        res.status(err.statusCode).json({
            status:err.status,
            message:err.message
        })
    }

    else{
        res.status(500).json({
            status:'error',
            message:'Something went wrong'
        })
    }
  
}



module.exports = (err,req,res,next)=>{
    err.statusCode = err.statusCode||500;
    err.status= err.status || 'error';

 if(process.env.NODE_ENV==='development'){
    devErrorResponse(err, res);
 }
 else if(process.env.NODE_ENV==='production'){
    console.log('Error in production starts here')
    if(err.name ==='CastError') err =handleDBError(err);
    if(err.code ===11000) err = handleDuplicateDB(err);

        if(err.name ==='ValidationError') err = handleValidationDB (err);
        
    prodErrorResponse(err, res);
 }
}