import { GoogleGenerativeAI } from '@google/generative-ai';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// Gemini gemini-embedding-001 produces 3072-dimensional vectors
// HuggingFace all-mpnet-base-v2 produces 768-dimensional vectors
// We'll use 3072 for Gemini (primary) or adjust based on provider
export const EMBEDDING_DIMENSION = 3072;

// HuggingFace model for embeddings (sentence-transformers) - 768 dims
const HF_EMBEDDING_MODEL = 'sentence-transformers/all-mpnet-base-v2';

let genAI: GoogleGenerativeAI | null = null;
let hfClient: HfInference | null = null;

type EmbeddingProvider = 'gemini' | 'huggingface' | 'none';

/**
 * Determine which embedding provider is available
 */
const getAvailableProvider = (): EmbeddingProvider => {
    if (GEMINI_API_KEY) return 'gemini';
    if (HUGGINGFACE_API_KEY) return 'huggingface';
    return 'none';
};

/**
 * Log which embedding provider will be used
 */
export const logEmbeddingProviderStatus = (): void => {
    const provider = getAvailableProvider();
    if (provider === 'gemini') {
        console.log('✅ Using Gemini for embeddings (primary)');
    } else if (provider === 'huggingface') {
        console.log('✅ Using HuggingFace for embeddings (fallback)');
    } else {
        console.warn('⚠️  No embedding API key configured!');
        console.warn('   Please set GEMINI_API_KEY or HUGGINGFACE_API_KEY in .env');
        console.warn('   Get Gemini key at: https://aistudio.google.com/');
        console.warn('   Get HuggingFace key at: https://huggingface.co/settings/tokens');
    }
};

const getGenAI = (): GoogleGenerativeAI => {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured');
    }
    if (!genAI) {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return genAI;
};

const getHfClient = (): HfInference => {
    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY is not configured. HuggingFace Inference API requires authentication.');
    }
    if (!hfClient) {
        hfClient = new HfInference(HUGGINGFACE_API_KEY);
    }
    return hfClient;
};

/**
 * Generate embeddings using Google Gemini embedding model
 * Available models: gemini-embedding-001 (768 dims), gemini-embedding-2-preview
 */
const generateGeminiEmbedding = async (text: string): Promise<number[]> => {
    const client = getGenAI();
    
    // Truncate text if too long (Gemini has a token limit)
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    // Use gemini-embedding-001 which produces 768-dimensional vectors
    const result = await client.getGenerativeModel({ model: 'gemini-embedding-001' }).embedContent(truncatedText);
    
    return result.embedding.values;
};

/**
 * Generate embeddings using HuggingFace Inference API
 * Uses sentence-transformers/all-mpnet-base-v2 which produces 768-dim vectors
 */
const generateHuggingFaceEmbedding = async (text: string): Promise<number[]> => {
    const client = getHfClient();
    
    // Truncate text if too long
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    const result = await client.featureExtraction({
        model: HF_EMBEDDING_MODEL,
        inputs: truncatedText,
    });

    // The result can be number[] or number[][] depending on the model
    // For sentence-transformers, it's typically number[]
    if (Array.isArray(result)) {
        // Check if it's nested
        if (Array.isArray(result[0])) {
            // It's number[][], take the first element
            return result[0] as number[];
        }
        // It's number[]
        return result as number[];
    }

    throw new Error('Unexpected response format from HuggingFace API');
};

/**
 * Generate embeddings with automatic fallback
 * Tries Gemini first if available, falls back to HuggingFace
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const provider = getAvailableProvider();

    if (provider === 'none') {
        throw new Error(
            'No embedding API configured. Please set GEMINI_API_KEY or HUGGINGFACE_API_KEY in your .env file. ' +
            'Get a free Gemini key at https://aistudio.google.com/ or HuggingFace key at https://huggingface.co/settings/tokens'
        );
    }

    // Try Gemini first if available
    if (provider === 'gemini' || GEMINI_API_KEY) {
        try {
            return await generateGeminiEmbedding(text);
        } catch (error: any) {
            console.warn('Gemini embedding failed:', error.message);
            // If HuggingFace is available, try it as fallback
            if (HUGGINGFACE_API_KEY) {
                console.log('Falling back to HuggingFace...');
            } else {
                throw error;
            }
        }
    }

    // Fallback to HuggingFace
    if (HUGGINGFACE_API_KEY) {
        try {
            return await generateHuggingFaceEmbedding(text);
        } catch (error: any) {
            console.error('HuggingFace embedding failed:', error.message);
            throw new Error('Failed to generate embedding: ' + error.message);
        }
    }

    throw new Error('No embedding service available');
};

/**
 * Chunk text into smaller pieces for embedding.
 * Important for long documents to stay within token limits.
 */
export const chunkText = (
    text: string,
    maxChunkSize: number = 1000,
    overlap: number = 200
): string[] => {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());

            // Keep overlap for context continuity
            const words = currentChunk.split(' ');
            const overlapWords = words.slice(-Math.floor(overlap / 5));
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
 * Generate embeddings for multiple text chunks.
 * Adds a small delay between requests to respect rate limits.
 */
export const generateEmbeddingsForChunks = async (chunks: string[]): Promise<number[][]> => {
    const embeddings: number[][] = [];

    // Delay between requests to respect rate limits
    const delay = 200;

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk) continue;

        const embedding = await generateEmbedding(chunk);
        embeddings.push(embedding);

        // Delay between requests
        if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return embeddings;
};