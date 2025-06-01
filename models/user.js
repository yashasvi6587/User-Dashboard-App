const mongoose = require("mongoose")

mongoose.connect(process.env.MONGO_URI)

const UserSchema = mongoose.Schema({
    username:String,
    name:String,
    email:String,
    password:String,
    age:Number,
    profilepic:{
        type:String,
        default:"default.jpg"
    },
    posts:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"post"
        }
    ]
})

module.exports = mongoose.model("user",UserSchema)
