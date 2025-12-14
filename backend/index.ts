import express from 'express';
import mongoose from 'mongoose';
import router from './routes/routes.js';
import dotenv from 'dotenv';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agentrag';

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Backend server is running',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api', router);

// MongoDB connection
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📝 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    });

mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB error:', error);
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected');
});
