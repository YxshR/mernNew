import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// const registerUser = asyncHandler(async (req, res) => {
//     res.status(200).json({
//         message: "OK with yash gupta"
//     })
// })


const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.gernateAccessToken()
        const refreshToken = user.gernateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false})

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "something went wrong while gernating refreshing and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    console.log("Uploaded Files:", req.files);
    
    const {fullName, email, username, password } = req.body

    // if(fullName === "") {
    //     throw new ApiError(400 , "FullName is required")
    // }

    if (
        [fullName, email, password, username].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, " All field are required")
    }


    const existedUser = await User.findOne({
        $or: [ {username}, {email} ]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username is already existed")
    }

    console.log(req.files);
    

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary (avatarLocalPath)
    const coverImage = await uploadOnCloudinary (coverImageLocalPath)


    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser){
        throw new ApiError(500, "Something went wrong while registering the User")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User register successfully")
    )

})

const loginUser = asyncHandler(async (req, res)=>{
    //req.body -> data
    //username or email
    //find the email or username
    //check the password
    //access and refresh token
    //send cookies


    const {email, username, password} = req.body

    console.log(email);

    if (!email && !username) {
        throw new ApiError(400, "Username or Email is required")
    }

    // if (!(email || username)) {
    //     throw new ApiError(400, "Username or Email is required")
    // }


    const user = await User.findOne({
        $or: [{email}, {username}],
    })

    if(!user){
        throw new ApiError(404, " user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Password")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken" )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            }, 
            "User logged in successfully"
        ) 
    )

})


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Wrong request")
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "invaled refresh token")
        }
    
        if(incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is used or expired")
        }
    
        const option = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken}  = await generateAccessAndRefreshToken (user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponse(
                    200,
                    {accessToken, refreshToken: newRefreshToken},
                    "Access token generated successfully"
            )
        )
    } catch (error) {
        throw new ApiError(404, error?.message || "Invalid RefreshToken")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incoorect password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password change successfully"))
})



const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User data successfully"))
})



const updateAccountDetail = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All field are Required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, {
        $set:{
            fullName,
            email
        }
    }, {new:true}).select("-password")
    res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))   
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while Uploading on Avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse (200, user, "Avatar Successfully"))
       
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while Uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json( new ApiResponse (200, user, "CoverImage Successfully"))
       
})

// const deletedOldAvatar = asyncHandler(async (req, res ) => {
//     const user = await User.findById(req.user?._id).select("-password")
//     const avatar = user.avatar
//     if (avatar) {
//         const avatarLocalPath = avatar
//         }

// })

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req. params

    if (!username?.trim) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                usename: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "subscribers"
                },
                channelSubscribedToCount:{
                     $size: "subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(200, "channel does not exsit")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, channel[0], "User Channel Fetch Successfully"))


})


const getWatchHistroy = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(res.user._id)
            },
            
                $lookup: {
                    from:"videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField:  "owner",
                                foreignField: "_id",
                                as:"owner",
                                pipeline: [
                                    {
                                        $project:{
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                },

            
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetail, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistroy}