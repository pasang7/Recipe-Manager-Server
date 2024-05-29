const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto =require('crypto')


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        trim: true,
    },
   
    username: {
        type: String,
        lowercase: true,
        trim: true,
    },

    email: {
        type: String,
        required: [true, "Please provide valid email address"],
        unique: [true, "Email already exist provide new email or Login"],
        validate: [validator.isEmail, "Please provide valid email format"],
        lowercase: true,
        trim: true,
    },

    password: {
        type: String,
        required: [true, "Please provid valid password"],
        minlength: [8, "Password must be atleast 8 character long"],
        select: false,
    },

    confirmPassword: {
        type: String,
        // required: [true, "Confirm password must match the initial password"],
        // validate: {
        //     //*compare confirmpassword with password. Function allow us to validate and pass message
        //     validator: function (el) {
        //         return el === this.password;
        //     },
        // },

        // message: "Password did not match",
    },

    userImage: {
        type: String,
        default: "user.jpg",
    },

    role: {
        type: String,
        enum: ["user", "admin", "superadmin"],
        default: "user",
    },

    bio:{
        type:String
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },

    active:{
        type: Boolean,
        default:true

    },

    passwordResetToken :String,
    
    passwordTokenExpire:Date,

    passwordChangedAt:Date
});

//!function to encrypt userpassword and generate username
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next;
    this.password = await bcrypt.hash(this.password, 12);
    this.username = this.email.split("@")[0];
    this.confirmPassword = undefined;
    next();
});

userSchema.pre('save', function(next){
    if(!this.isModified('password')|| this.isNew) return next();

    this.passwordChangedAt = Date.now()- 1000;
    next();
})

userSchema.pre(/^find/ ,function(next){
   this.find({active :{$ne:false}})
    next();
})



//*in schema we have an access to method properties to create function

userSchema.methods.checkPwdEncryption = async function (userPwd, encryptedPwd) {
    return await bcrypt.compare(userPwd, encryptedPwd);

    //*this function hs 2 parameter one will be plain pwd and one encrypted which is compared using bcrypt.compare
};

userSchema.methods.checkIfPswdChanged = function(JWTtimestamp){

    if(this.passwordChangedAt){
        const convertedTime = parseInt(this.passwordChangedAt.getTime()/1000, 10);
        return JWTtimestamp < convertedTime
    }
    return false
}

userSchema.methods.webToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

userSchema.methods.generatePasswordResetToken = function (){
const resetToken = crypto.randomBytes(32).toString('hex');
this.passwordResetToken= crypto.createHash('sha256').update(resetToken).digest('hex');
this.passwordTokenExpire = Date.now()+10 *60*1000;
return resetToken;
}

const User = mongoose.model("User", userSchema);
module.exports = User;