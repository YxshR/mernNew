import mongoose, {Schema, Types} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema (
    {
     videoFile:{
        type: String,
        required: true
     },
     thumbnail:{
        type: String,
        required: true
     },
     description:{
        type: String,
        required: true
     },
     duration:{
        type: Number,
        required: true
     },
     view:{
        type: Number,
        default: 0
     },
     isPublished:{
        type: Boolean,
        default: true
     },
     owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
     },



    },
    {
        timeseries: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("video", videoSchema ) 