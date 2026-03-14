import mongoose from "mongoose";

// Chat Session Schema
const chatSessionSchema = new mongoose.Schema({
    noteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Notes",
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: "New Chat"
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient querying
chatSessionSchema.index({ noteId: 1, userId: 1, updatedAt: -1 });

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChatSession",
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true
    },
    content: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Index for efficient querying
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export const ChatSession = mongoose.model("ChatSession", chatSessionSchema);
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);