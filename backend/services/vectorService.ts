import { upsertVectors, queryVectors, deleteVectors } from '../pinecone.js';
import { generateEmbedding, chunkText, generateEmbeddingsForChunks } from './embeddingService.js';

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'agentrag-notes';

/**
 * Store note content in Pinecone vector database
 */
export const storeNoteEmbeddings = async (
    noteId: string,
    userId: string,
    title: string,
    content: string
): Promise<void> => {
    try {
        // Chunk the content for better retrieval
        const chunks = chunkText(content);
        
        // Generate embeddings for each chunk
        const embeddings = await generateEmbeddingsForChunks(chunks);
        
        // Prepare vectors for upsert
        const vectors = chunks.map((chunk, index) => {
            const embedding = embeddings[index];
            if (!embedding) {
                throw new Error(`Missing embedding for chunk ${index}`);
            }
            return {
                id: `${noteId}-chunk-${index}`,
                values: embedding,
                metadata: {
                    noteId,
                    userId,
                    title,
                    chunkIndex: index,
                    totalChunks: chunks.length,
                    content: chunk,
                    timestamp: new Date().toISOString()
                }
            };
        });
        
        // Upsert to Pinecone
        await upsertVectors(INDEX_NAME, vectors);
        
        console.log(`✅ Stored ${vectors.length} chunks for note ${noteId} in Pinecone`);
    } catch (error) {
        console.error('Error storing note embeddings:', error);
        throw new Error('Failed to store note in vector database');
    }
};

/**
 * Query Pinecone for relevant note content based on a question
 */
export const queryNoteContent = async (
    query: string,
    noteId?: string,
    userId?: string,
    topK: number = 5
): Promise<Array<{ content: string; score: number; metadata: any }>> => {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);
        
        // Prepare filter
        const filter: Record<string, any> = {};
        if (noteId) filter.noteId = noteId;
        if (userId) filter.userId = userId;
        
        // Query Pinecone
        const results = await queryVectors(
            INDEX_NAME,
            queryEmbedding,
            topK,
            Object.keys(filter).length > 0 ? filter : undefined
        );
        
        // Format results
        return results.matches?.map((match: any) => ({
            content: match.metadata?.content || '',
            score: match.score || 0,
            metadata: match.metadata
        })) || [];
    } catch (error) {
        console.error('Error querying note content:', error);
        throw new Error('Failed to query vector database');
    }
};

/**
 * Delete note embeddings from Pinecone
 */
export const deleteNoteEmbeddings = async (noteId: string): Promise<void> => {
    try {
        // Query to find all chunk IDs for this note
        const results = await queryVectors(INDEX_NAME, Array(1536).fill(0), 1000, { noteId });
        
        if (results.matches && results.matches.length > 0) {
            const ids = results.matches.map((match: any) => match.id);
            await deleteVectors(INDEX_NAME, ids);
            console.log(`✅ Deleted ${ids.length} chunks for note ${noteId} from Pinecone`);
        }
    } catch (error) {
        console.error('Error deleting note embeddings:', error);
        // Don't throw error for deletion failures
    }
};

/**
 * Update note embeddings (delete old, create new)
 */
export const updateNoteEmbeddings = async (
    noteId: string,
    userId: string,
    title: string,
    content: string
): Promise<void> => {
    await deleteNoteEmbeddings(noteId);
    await storeNoteEmbeddings(noteId, userId, title, content);
};
