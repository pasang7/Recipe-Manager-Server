const crypto = require('crypto')
const User = require("../Model/userModel");
const catchAsync = require("../utils/catchAsyncError");
const AppError = require("../utils/globalError");
const {generateToken, verifyToken} = require('../utils/jwtTokenHandler');
const sendResetEmail = require('../utils/passwordResetMail');
const sharp = require("sharp");
const multer = require("multer");

const filterObj =(obj, ...fields)=>{
const newObj = {};
    Object.keys(obj).forEach(el=>{
        if(fields.includes(el)) newObj[el] = obj[el]
    })
  return newObj;      
}

const multerStorage = multer.memoryStorage();

//creating filter to validate file type(only image is allwowed)
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(
            new AppError("Invalid file type. Please upload image only", 400),
            false
        );
    }
};

//middleware to implement file storage and type
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
});

//single is function to handle just single file for user profile only 1 image is enough
exports.uploadUserImage = upload.single("userImage"); //userImage is field we define on user model

exports.resizeUserImage = catchAsync( async (req, res, next) => {
if (!req.file) return next();
    console.log(req.file.filename, "userfilename");
   req.file.filename = `UserProfile-${Date.now()}-${req.user.id}-user.jpeg`; // creating unique filename

   await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/images/users/${req.file.filename}`) // location of file in system
    next();
});


exports.signUpUser = catchAsync(async (req, res, next) => {
    try {
    const { name, email, password, confirmPassword } = req.body;
    
    if (!password.match(/^(?=.*[a-zA-Z])(?=.*[0-9]).*$/)) {
        return next(new AppError("Password must contain both number and letter", 401));
    }
    
    if (password !== confirmPassword) {
        return next(new AppError("Passwords do not match", 401));
    }
    
    const user = await User.findOne({ email });
    
    if (user) {
        return next(new AppError("Email already exists", 401)); 
    }
    
    const newUser = await User.create({ name, email, password });
    
    if (!newUser) {
        return next(new AppError(`Something went wrong while signing up. Please check user credentials`, 400));
    }
    
    res.status(201).json({
        success: true,
        message: 'Your account has been created successfully',
    });
} catch (err) {
    console.log(err);
}
    
});

//!Login function
exports.logInUser = catchAsync(async (req, res, next) => {
    try {
        console.log('auth', req.headers.authorization);
        //!first to provide login function we need email and password from request body
        const { email, password } = req.body;

        //!check we have both emil and password
        if (!email || !password) {
            return next(new AppError("Email and Password is required field", 401));
        }
        //!then we need to check if email is registered or not
        const user = await User.findOne({ email }).select("+password");

        //!function to compre user input pwd with encrypted password in database
        if (!user || !(await user.checkPwdEncryption(password, user.password))) {
            return next(
                new AppError(
                    "Either email or password didnt match user credentials",
                    401
                )
            );
        }

        generateToken(user,200,res)

    } catch (e) {
        console.error(e);
    }

 
});

exports.protectRoute = catchAsync(async (req, res, next) => {
    try {

        // Extract Bearer token from headers
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1]; // Extract token part
        }

        // console.log('token: ' + token);

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'Authorization token not found'
            });
        }

        // Verify the token and decode its payload
        const decoded = await verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid or expired token'
            });
        }

        // Check if the user exists
        const existUser = await User.findById(decoded.id);
        if (!existUser) {
            return res.status(401).json({
                status: 'fail',
                message: 'User does not exist for the provided token'
            });
        }

        // Check if the user changed their password after the token was issued
        if (await existUser.checkIfPswdChanged(decoded.iat)) {
            return res.status(401).json({
                status: 'fail',
                message: 'User has changed their password recently'
            });
        }

        // Attach user data to the request
        req.user = existUser;
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Authorization error:', error); // Log the error for debugging
        return res.status(401).json({
            status: 'error',
            message: 'Authorization error'
        });
    }
});



exports.authorizationRoutes = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {

            return next(new AppError(' You do not have access to complete this action', 403));
        }

        next();
    }
}

exports.forgetPassword = catchAsync(async(req,res,next)=>{

    if(!req.body.email){
        return next(new AppError('Please provide email address', 400 ))
    }
    const user = await User.findOne({email:req.body.email});

    if(!user){
        return next (new AppError('No user is registered with provided email', 404))
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save({validateBeforeSave:false});

    //!defining url to password reset and sending email

    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/user/resetPassword/${resetToken}`;
    const message = `Forgot your password? If yes then use this link to reset your password using PATCH request on ${resetURL} URL
    \n If this is not what you have requested please kindly ignore this email. \n Thank You `;
    
try{

    await sendResetEmail({
        email:user.email,
        subject:'Your password reset link (This token will expire in 10 minutes)',
        message
    })
    res.status(200).json({
        success:'success',
        message:'Token sent to email'
    })
}
 catch(err){

    user.passwordResetToken = undefined;
    user.passwordTokenExpire= undefined;
    await user.save({validateBeforeSave:false});

    return next(new AppError('Something went wrong while sending email to user'), 500);
}

})
  
exports.resetPassword = catchAsync(async(req,res,next)=>{

    if(req.params.token.length<64){
        return next (new AppError('Please provide valid token'), 400)
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({passwordResetToken: hashedToken,
         passwordResetToken:{
            $gt:Date.now()
         }}).select('+password')

         if(!user){
            return next(new AppError('Invalid reset token or token has expired'), 400)
         }
    
     const newPassHash = await user.checkPwdEncryption(req.body.password, user.password)
if (newPassHash){
    return next(new AppError('Thats your current password. Either login or provide new password'))
}
         user.password = req.body.password;
         user.confirmPassword = req.body.confirmPassword;
         user.passwordResetToken=undefined;
         user.passwordTokenExpire=undefined;
         await user.save();

     generateToken(user,200,res);
        


})

exports.updatePassword = catchAsync(async(req,res,next)=>{
    const user = await User.findById(req.user.id).select('+password');
    if(!user){
        return next(new AppError('This is protected route, so must log in.'),403)
    }
   if(!req.body.currentPassword){
    return next(new AppError('Please provide your current password'), 400)
   }
   const comparePassword = await user.checkPwdEncryption(req.body.currentPassword, user.password)

   if(!comparePassword){
    return next(new AppError('Password wrong, please provide correct password'),400)
   }

   if(!req.body.password || !req.body.confirmPassword){
    return next (new AppError('Password and password confirm field is required'),400)
   }

   user.password=req.body.password;
   user.confirmPassword =req.body.confirmPassword
   await user.save()
  generateToken(user,200,res)
   
})

exports.updateMe = catchAsync(async (req, res, next) => {
  try {
   
    if (req.body.password || req.body.confirmPassword) {
      return next(new AppError('To update your password follow "/updatePassword" '))
    }

    const filteredBody = filterObj(req.body, 'email', 'bio', 'name', 'username', 'userId')

    if (req.file) filteredBody.userImage = req.file.filename

    // Check if email already exists
    const existingUser = await User.findOne({ email: filteredBody.email })
    if (existingUser && existingUser._id.toString() !== req.body.userId) {
      return next(new AppError('Email already exists', 400))
    }

    const user = await User.findByIdAndUpdate(req.body.userId, filteredBody, {
      new: true,
      runValidators: true
    })
    if (!user) {
      return next(new AppError('No user found for email', 404))
    }

    res.status(200).json({
      status: 'success',
      updatedUser: user
    })
  } catch (err) {
    console.error(err)
  }
})