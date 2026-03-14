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
    notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notes", required: true }],
    // Encrypted API Keys (stored securely)
    apiKeys: {
        pinecone: {
            type: String,
            default: null
        },
        pineconeIndex: {
            type: String,
            default: null
        },
        groq: {
            type: String,
            default: null
        },
        gemini: {
            type: String,
            default: null
        },
        serper: {
            type: String,
            default: null
        }
    },
    hasApiKeys: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    })

export const User = mongoose.model("User", userSchema);