import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../model/user.js';
import { Notes } from '../model/notes.js';
import { ChatSession, ChatMessage } from '../model/chat.js';
import { upload } from '../middleware/upload.js';
import { authenticate } from '../middleware/auth.js';
import { processFile } from '../utils/fileProcessor.js';
import { storeNoteEmbeddings, deleteNoteEmbeddings, updateNoteEmbeddings, queryNoteContent, isVectorServiceAvailable } from '../services/vectorService.js';
import { logEmbeddingProviderStatus } from '../services/embeddingService.js';
import { encrypt, decrypt, maskApiKey } from '../utils/encryption.js';
import axios from 'axios';

const router = Router();
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || 'http://localhost:8000';

// Log service availability on startup
logEmbeddingProviderStatus();

if (!process.env.PINECONE_API_KEY) {
    console.warn('⚠️  PINECONE_API_KEY not configured. Vector search will not work.');
    console.warn('   Get a free key at: https://www.pinecone.io/');
}

if (isVectorServiceAvailable()) {
    console.log('✅ Vector service ready');
}

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

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ emailId, password: hashedPassword, notes: [] });
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

router.post('/auth/login', async (req, res) => {
    const { emailId, password } = req.body;

    try {
        if (!emailId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: emailId, password'
            });
        }

        const user = await User.findOne({ emailId });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not configured in environment variables');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }
        const token = jwt.sign(
            { userId: user._id.toString(), emailId: user.emailId },
            jwtSecret,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                emailId: user.emailId
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

router.get('/notes/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;

    if (req.userId !== userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }

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

router.get('/note/:noteId', authenticate, async (req, res) => {
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

router.post('/note', authenticate, async (req, res) => {
    const { userId, title, content, metaData } = req.body;

    try {
        if (!userId || !title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, title, content'
            });
        }

        if (req.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
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

        try {
            await storeNoteEmbeddings(newNote._id.toString(), userId, title, content);
        } catch (embeddingError) {
            console.error('Error storing embeddings:', embeddingError);
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

router.post('/note/upload', authenticate, upload.single('file'), async (req, res) => {
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

        if (req.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const processedFile = await processFile(req.file.path, req.file.originalname, req.file.size);

        const newNote = new Notes({
            title,
            content: processedFile.text,
            metaData: processedFile.metadata
        });

        await newNote.save();

        user.notes.push(newNote._id);
        await user.save();

        try {
            await storeNoteEmbeddings(newNote._id.toString(), userId, title, processedFile.text);
        } catch (embeddingError) {
            console.error('Error storing embeddings:', embeddingError);
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

router.put('/note/:noteId', authenticate, async (req, res) => {
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

        if (content && content !== oldContent) {
            try {
                const user = await User.findOne({ notes: noteId as any });
                if (user) {
                    await updateNoteEmbeddings(noteId as string, user._id.toString(), note.title, note.content);
                }
            } catch (embeddingError) {
                console.error('Error updating embeddings:', embeddingError);
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

router.delete('/note/:noteId', authenticate, async (req, res) => {
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
            await User.findByIdAndUpdate(userId, { $pull: { notes: noteId } });
        }

        try {
            await deleteNoteEmbeddings(noteId as string);
        } catch (embeddingError) {
            console.error('Error deleting embeddings:', embeddingError);
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

router.post('/chat/:noteId', authenticate, async (req, res) => {
    const { noteId } = req.params;
    const { message, userId } = req.body;

    try {
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const note = await Notes.findById(noteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        const relevantChunks = await queryNoteContent(message, noteId, userId, 5);

        if (relevantChunks.length === 0) {
            return res.status(200).json({
                success: true,
                response: "I couldn't find relevant information in this note to answer your question. Could you rephrase or ask something else about the document?",
                sources: []
            });
        }

        const context = relevantChunks
            .map((chunk, i) => `[${i + 1}] ${chunk.content}`)
            .join('\n\n');

        try {
            // Retrieve user's decrypted LLM keys to pass to the RAG service
            const user = await User.findById(userId || req.userId);
            const userKeys = (user?.apiKeys as any) || {};

            const ragPayload: any = {
                query: message,
                context,
                noteTitle: note.title,
            };
            if (userKeys.groq) ragPayload.groq_api_key = decrypt(userKeys.groq);
            if (userKeys.gemini) ragPayload.gemini_api_key = decrypt(userKeys.gemini);
            if (userKeys.serper) ragPayload.serper_api_key = decrypt(userKeys.serper);

            const ragResponse = await axios.post(
                `${RAG_SERVICE_URL}/chat`,
                ragPayload,
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
            console.warn('Python RAG service unavailable, using fallback:', ragError.message);

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

// ==================== API KEYS ROUTES ====================

// Save API Keys
router.post('/user/api-keys', authenticate, async (req, res) => {
    const { userId, pineconeKey, pineconeIndex, groqKey, geminiKey, serperKey } = req.body;

    try {
        if (req.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Encrypt and store API keys
        const updates: any = {};
        if (pineconeKey) updates['apiKeys.pinecone'] = encrypt(pineconeKey);
        if (pineconeIndex) updates['apiKeys.pineconeIndex'] = encrypt(pineconeIndex);
        if (groqKey) updates['apiKeys.groq'] = encrypt(groqKey);
        if (geminiKey) updates['apiKeys.gemini'] = encrypt(geminiKey);
        if (serperKey) updates['apiKeys.serper'] = encrypt(serperKey);

        // hasApiKeys = true if any LLM key is configured
        const freshUser = await User.findById(userId);
        const freshKeys = (freshUser?.apiKeys as any) || {};
        const hasKeys = !!(groqKey || geminiKey || freshKeys.groq || freshKeys.gemini);
        updates['hasApiKeys'] = hasKeys;

        await User.findByIdAndUpdate(userId, { $set: updates });

        return res.status(200).json({
            success: true,
            message: 'API keys saved securely',
            hasApiKeys: hasKeys
        });
    } catch (error) {
        console.error('Error saving API keys:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to save API keys',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get API Keys (masked)
router.get('/user/api-keys/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;

    try {
        if (req.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Return masked keys
        const apiKeys = (user.apiKeys as any) || {};
        return res.status(200).json({
            success: true,
            apiKeys: {
                pinecone: apiKeys.pinecone ? maskApiKey(decrypt(apiKeys.pinecone)) : null,
                pineconeIndex: apiKeys.pineconeIndex ? decrypt(apiKeys.pineconeIndex) : null,
                groq: apiKeys.groq ? maskApiKey(decrypt(apiKeys.groq)) : null,
                gemini: apiKeys.gemini ? maskApiKey(decrypt(apiKeys.gemini)) : null,
                serper: apiKeys.serper ? maskApiKey(decrypt(apiKeys.serper)) : null,
                hasPinecone: !!apiKeys.pinecone,
                hasGroq: !!apiKeys.groq,
                hasGemini: !!apiKeys.gemini,
                hasSerper: !!apiKeys.serper,
                // Whether the server .env already has these keys configured
                serverHasGroq: !!process.env.GROQ_API_KEY,
                serverHasGemini: !!process.env.GEMINI_API_KEY,
                serverHasSerper: !!process.env.SERPER_API_KEY,
            },
            hasApiKeys: user.hasApiKeys || !!process.env.GROQ_API_KEY || !!process.env.GEMINI_API_KEY
        });
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch API keys',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete API Keys
router.delete('/user/api-keys/:userId', authenticate, async (req, res) => {
    const { userId } = req.params;

    try {
        if (req.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        await User.findByIdAndUpdate(userId, {
            $set: {
                'apiKeys.pinecone': null,
                'apiKeys.pineconeIndex': null,
                'apiKeys.groq': null,
                'apiKeys.gemini': null,
                'apiKeys.serper': null,
                hasApiKeys: false
            }
        });

        return res.status(200).json({
            success: true,
            message: 'API keys deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting API keys:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete API keys',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// ==================== CHAT SESSIONS ROUTES ====================

// Get chat sessions for a note (limited to 20)
router.get('/chat-sessions/:noteId', authenticate, async (req, res) => {
    const { noteId } = req.params;
    const userId = req.userId;

    try {
        const sessions = await ChatSession.find({ noteId, userId })
            .sort({ updatedAt: -1 })
            .limit(20);

        return res.status(200).json({
            success: true,
            sessions
        });
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch chat sessions',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Create new chat session
router.post('/chat-sessions', authenticate, async (req, res) => {
    const { noteId, title } = req.body;
    const userId = req.userId;

    try {
        // Check session limit (20 per note)
        const sessionCount = await ChatSession.countDocuments({ noteId, userId });
        
        if (sessionCount >= 20) {
            // Delete oldest session
            const oldestSession = await ChatSession.findOne({ noteId, userId })
                .sort({ updatedAt: 1 });
            
            if (oldestSession) {
                await ChatMessage.deleteMany({ sessionId: oldestSession._id });
                await ChatSession.findByIdAndDelete(oldestSession._id);
            }
        }

        const newSession = new ChatSession({
            noteId,
            userId,
            title: title || 'New Chat'
        });

        await newSession.save();

        return res.status(201).json({
            success: true,
            session: newSession
        });
    } catch (error) {
        console.error('Error creating chat session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create chat session',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update chat session title
router.put('/chat-sessions/:sessionId', authenticate, async (req, res) => {
    const { sessionId } = req.params;
    const { title } = req.body;

    try {
        const session = await ChatSession.findById(sessionId);
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.userId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        session.title = title;
        await session.save();

        return res.status(200).json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Error updating chat session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update chat session',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete chat session
router.delete('/chat-sessions/:sessionId', authenticate, async (req, res) => {
    const { sessionId } = req.params;

    try {
        const session = await ChatSession.findById(sessionId);
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.userId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        // Delete all messages in the session
        await ChatMessage.deleteMany({ sessionId });
        await ChatSession.findByIdAndDelete(sessionId);

        return res.status(200).json({
            success: true,
            message: 'Chat session deleted'
        });
    } catch (error) {
        console.error('Error deleting chat session:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete chat session',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get messages for a chat session
router.get('/chat-messages/:sessionId', authenticate, async (req, res) => {
    const { sessionId } = req.params;

    try {
        const session = await ChatSession.findById(sessionId);
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.userId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const messages = await ChatMessage.find({ sessionId })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            success: true,
            messages
        });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch chat messages',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Add message to chat session
router.post('/chat-messages', authenticate, async (req, res) => {
    const { sessionId, role, content } = req.body;

    try {
        const session = await ChatSession.findById(sessionId);
        
        if (!session) {
            return res.status(404).json({ success: false, message: 'Session not found' });
        }

        if (session.userId !== req.userId) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const newMessage = new ChatMessage({
            sessionId,
            role,
            content
        });

        await newMessage.save();

        // Update session's updatedAt
        session.updatedAt = new Date();
        
        // Auto-generate title from first user message if still default
        if (session.title === 'New Chat' && role === 'user') {
            session.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        }
        
        await session.save();

        return res.status(201).json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        console.error('Error adding chat message:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to add chat message',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
