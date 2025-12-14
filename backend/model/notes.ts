import mongoose from "mongoose";

const notesSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    content:{
        type: String,
        required: true

    },
    metaData:{
          filePages:{
            type:Number,
            required:true
          },
          fileSize:{
            type:String,
            required:true
          },
      fileType:{
        type: String,
        enum: ['pdf','docx','doc','txt'],
        required: true
      },
      
      uploadedOn:{
        type: Date,
        required: true
      },
      textLength:{
        type: Number,
        required: true
      }
    }

})

export const Notes = mongoose.model("Notes",notesSchema);