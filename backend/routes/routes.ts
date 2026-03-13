import { Router } from 'express';
import { User } from '../model/user.js';
import { Notes } from '../model/notes.js';
import { upload } from '../middleware/upload.js';
import { processFile } from '../utils/fileProcessor.js';
import { storeNoteEmbeddings, deleteNoteEmbeddings, updateNoteEmbeddings, queryNoteContent } from '../services/vectorService.js';
import axios from 'axios';

const router = Router();
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

router.get('/notes/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const user = await User.findById(userId).populate('notes');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            notes: user.notes 
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get a specific note by ID
router.get('/note/:noteId', async (req, res) => {
    const { noteId } = req.params;
    
    try {
        const note = await Notes.findById(noteId);
        
        if (!note) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
        
        return res.status(200).json({ 
            success: true, 
            note 
        });
    } catch (error) {
        console.error('Error fetching note:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create a new note
router.post('/note', async (req, res) => {
    const { userId, title, content, metaData } = req.body;
    
    try {
        if (!userId || !title || !content) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: userId, title, content' 
            });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const newNote = new Notes({
            title,
            content,
            metaData: metaData || {
                filePages: 1,
                fileSize: `${content.length} chars`,
                fileType: 'txt',
                uploadedOn: new Date(),
                textLength: content.length
            }
        });
        
        await newNote.save();
        
        user.notes.push(newNote._id);
        await user.save();

        // Store embeddings in Pinecone
        try {
            await storeNoteEmbeddings(
                newNote._id.toString(),
                userId,
                title,
                content
            );
        } catch (embeddingError) {
            console.error('Error storing embeddings:', embeddingError);
            // Continue even if embedding fails
        }
        
        return res.status(201).json({ 
            success: true, 
            message: 'Note created successfully',
            note: newNote 
        });
    } catch (error) {
        console.error('Error creating note:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Upload file and create note
router.post('/note/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { userId, title } = req.body;

        if (!userId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, title'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Process the uploaded file
        const processedFile = await processFile(
            req.file.path,
            req.file.originalname,
            req.file.size
        );

        // Create note with extracted text
        const newNote = new Notes({
            title,
            content: processedFile.text,
            metaData: processedFile.metadata
        });

        await newNote.save();

        user.notes.push(newNote._id);
        await user.save();

        // Store embeddings in Pinecone
        try {
            await storeNoteEmbeddings(
                newNote._id.toString(),
                userId,
                title,
                processedFile.text
            );
        } catch (embeddingError) {
            console.error('Error storing embeddings:', embeddingError);
            // Continue even if embedding fails
        }

        return res.status(201).json({
            success: true,
            message: 'Note created successfully from file',
            note: newNote
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process uploaded file',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update a note
router.put('/note/:noteId', async (req, res) => {
    const { noteId } = req.params;
    const { title, content } = req.body;
    
    try {
        const note = await Notes.findById(noteId);
        
        if (!note) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
        
        const oldContent = note.content;
        
        if (title) note.title = title;
        if (content) {
            note.content = content;
            if (note.metaData) {
                note.metaData.textLength = content.length;
            }
        }
        
        await note.save();

        // Update embeddings if content changed
        if (content && content !== oldContent) {
            try {
                // Find user to get userId
                const user = await User.findOne({ notes: noteId });
                if (user) {
                    await updateNoteEmbeddings(
                        noteId,
                        user._id.toString(),
                        note.title,
                        note.content
                    );
                }
            } catch (embeddingError) {
                console.error('Error updating embeddings:', embeddingError);
                // Continue even if embedding update fails
            }
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Note updated successfully',
            note 
        });
    } catch (error) {
        console.error('Error updating note:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete a note
router.delete('/note/:noteId', async (req, res) => {
    const { noteId } = req.params;
    const { userId } = req.body;
    
    try {
        const note = await Notes.findByIdAndDelete(noteId);
        
        if (!note) {
            return res.status(404).json({ 
                success: false, 
                message: 'Note not found' 
            });
        }
        
        if (userId) {
            await User.findByIdAndUpdate(
                userId, 
                { $pull: { notes: noteId } }
            );
        }

        // Delete embeddings from Pinecone
        try {
            await deleteNoteEmbeddings(noteId);
        } catch (embeddingError) {
            console.error('Error deleting embeddings:', embeddingError);
            // Continue even if embedding deletion fails
        }
        
        return res.status(200).json({ 
            success: true, 
            message: 'Note deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create a new user
router.post('/user', async (req, res) => {
    const { emailId, password } = req.body;
    
    try {
        if (!emailId || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: emailId, password' 
            });
        }
        
        const existingUser = await User.findOne({ emailId });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'User already exists' 
            });
        }
        
        const newUser = new User({ emailId, password, notes: [] });
        await newUser.save();
        
        return res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user: { 
                id: newUser._id, 
                emailId: newUser.emailId 
            } 
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Chat with a note using RAG
router.post('/chat/:noteId', async (req, res) => {
    const { noteId } = req.params;
    const { message, userId } = req.body;

    try {
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Verify note exists
        const note = await Notes.findById(noteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Query Pinecone for relevant content
        const relevantChunks = await queryNoteContent(message, noteId, userId, 5);

        if (relevantChunks.length === 0) {
            return res.status(200).json({
                success: true,
                response: "I couldn't find relevant information in this note to answer your question. Could you rephrase or ask something else about the document?",
                sources: []
            });
        }

        // Prepare context from retrieved chunks
        const context = relevantChunks
            .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
            .join('\n\n');

        // Try to call Python RAG service if available
        try {
            const ragResponse = await axios.post(
                `${RAG_SERVICE_URL}/chat`,
                {
                    query: message,
                    context: context,
                    noteTitle: note.title
                },
                { timeout: 30000 }
            );

            return res.status(200).json({
                success: true,
                response: ragResponse.data.response,
                sources: relevantChunks.map(chunk => ({
                    content: chunk.content.substring(0, 200) + '...',
                    score: chunk.score
                }))
            });
        } catch (ragError: any) {
            console.warn('Python RAG service unavailable, using simple response:', ragError.message);

            // Fallback: Simple context-based response
            const firstChunk = relevantChunks[0];
            const simpleResponse = firstChunk 
                ? `Based on the note "${note.title}", here's what I found:\n\n${firstChunk.content.substring(0, 500)}...`
                : `I found information related to your question in "${note.title}", but couldn't generate a detailed response.`;

            return res.status(200).json({
                success: true,
                response: simpleResponse,
                sources: relevantChunks.map(chunk => ({
                    content: chunk.content.substring(0, 200) + '...',
                    score: chunk.score
                })),
                fallback: true
            });
        }
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process chat message',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;