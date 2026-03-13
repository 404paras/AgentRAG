import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'; // or 'text-embedding-ada-002'

/**
 * Generate embeddings using OpenAI API
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured');
    }

    try {
        const response = await axios.post(
            'https://api.openai.com/v1/embeddings',
            {
                model: OPENAI_EMBEDDING_MODEL,
                input: text
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data[0].embedding;
    } catch (error: any) {
        console.error('Error generating embedding:', error.response?.data || error.message);
        throw new Error('Failed to generate embedding');
    }
};

/**
 * Chunk text into smaller pieces for embedding
 * This is important for long documents
 */
export const chunkText = (text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] => {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            
            // Keep overlap for context continuity
            const words = currentChunk.split(' ');
            const overlapWords = words.slice(-Math.floor(overlap / 5)); // Approximate word count
            currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
            currentChunk += sentence;
        }
    }
    
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text];
};

/**
 * Generate embeddings for multiple text chunks
 */
export const generateEmbeddingsForChunks = async (chunks: string[]): Promise<number[][]> => {
    const embeddings: number[][] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;
        
        const embedding = await generateEmbedding(chunk);
        embeddings.push(embedding);
        
        // Small delay to respect rate limits
        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return embeddings;
};
