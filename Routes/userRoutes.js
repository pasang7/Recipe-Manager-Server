const express = require("express");
const {
    signUpUser,
    logInUser,
    protectRoute,
    authorizationRoutes,
    forgetPassword,
    resetPassword,
    updatePassword,
    updateMe,
    resizeUserImage,
    uploadUserImage,
} = require("../Controller/authController");
const {
    getAllUser,
    getSingleUser,
    updateUserSelf,
    deleteUser,
    getUserImage
   
} = require("../Controller/userController");

const router = express.Router();

router.route("/signup").post(signUpUser);


router.route("/").get(protectRoute, authorizationRoutes("admin", "superadmin"), getAllUser);

router.patch("/updateMe", protectRoute, uploadUserImage, resizeUserImage, updateMe);
router.route('/images/:filename').get(getUserImage);


router.route("/:id")
    .get(protectRoute, getSingleUser)
    .patch(protectRoute, updateUserSelf)
    .delete(protectRoute, deleteUser);

router.route("/login").post(logInUser);

router.patch("/resetPassword/:token", resetPassword);

router.post("/forgetPassword", forgetPassword);

router.patch("/login/updatePassword", protectRoute, updatePassword);

module.exports = router;