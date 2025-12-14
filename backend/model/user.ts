import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    emailId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notes", required: true }]
},
    {
        timestamps: true
    })

export const User = mongoose.model("User",userSchema);