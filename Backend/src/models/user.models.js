import mongoose, {Schema, Types} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username: {
        Types: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true,
        index: true
    },
    email: {
        Types: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true
    },
    fullName: {
        Types: String,
        required: true,
        trim: true,
        index: true
    },
    avtar: {
        Types: String, //cloudinary url
        required: true,

    },
    coverImage: {
        Types: String,

    },
    watchHistory : [
        {
            type: Schema.Types.ObjectId,
            ref: "video"
        }
    ],
    password:{
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String
    }

},
{
    timestamps: true
}
)

userSchema.pre("save", async function (next) {
    if(!this.isModified("password")) return next
    this.password = bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    await bcrypt.compare(password, this.password)
}

userSchema.methods.gernateAccessToken = function () {
    jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName

        },
        process.env.ACESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACESS_TOKEN_EXPIRY
        }
        
    )
}




userSchema.methods.gernateRefreshToken = function () {
    jwt.sign(
        {
            _id: this._id,


        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
        
    )
}





export const User = mongoose.model("User", userSchema ) 