import { Router } from 'express';
import { User } from '../model/user.js';
import { Notes } from '../model/notes.js';

const router = Router();

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
        
        if (title) note.title = title;
        if (content) {
            note.content = content;
            if (note.metaData) {
                note.metaData.textLength = content.length;
            }
        }
        
        await note.save();
        
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

export default router;