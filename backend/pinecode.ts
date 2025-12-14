import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

let pineconeClient: Pinecone | null = null;

/**
 * Initialize Pinecone client
 * Call this once when your app starts
 */
export const initializePinecone = async (): Promise<Pinecone> => {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY is not set in environment variables');
  }

  pineconeClient = new Pinecone({
    apiKey: apiKey,
  });

  console.log('✅ Pinecone client initialized');
  return pineconeClient;
};

/**
 * Get or create a Pinecone index
 * @param indexName - Name of the index
 * @param dimension - Vector dimension (e.g., 1536 for OpenAI embeddings, 768 for sentence-transformers)
 */
export const getOrCreateIndex = async (
  indexName: string = 'agentrag-notes',
  dimension: number = 1536
) => {
  const pc = await initializePinecone();

  try {
    // Check if index exists
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes?.some(index => index.name === indexName);

    if (!indexExists) {
      console.log(`Creating index: ${indexName}`);
      
      // Create index with pod-based configuration
      await pc.createIndex({
        name: indexName,
        dimension: dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        },
        waitUntilReady: true,
      });

      console.log(`✅ Index ${indexName} created successfully`);
    } else {
      console.log(`✅ Index ${indexName} already exists`);
    }

    return pc.index(indexName);
  } catch (error) {
    console.error('Error creating/accessing index:', error);
    throw error;
  }
};

/**
 * Upsert vectors to Pinecone
 * @param indexName - Name of the index
 * @param vectors - Array of vectors with id, values, and metadata
 */
export const upsertVectors = async (
  indexName: string,
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>
) => {
  const index = await getOrCreateIndex(indexName);
  
  try {
    await index.upsert(vectors);
    console.log(`✅ Upserted ${vectors.length} vectors to ${indexName}`);
    return { success: true, count: vectors.length };
  } catch (error) {
    console.error('Error upserting vectors:', error);
    throw error;
  }
};

/**
 * Query vectors from Pinecone
 * @param indexName - Name of the index
 * @param vector - Query vector
 * @param topK - Number of results to return
 * @param filter - Metadata filter
 */
export const queryVectors = async (
  indexName: string,
  vector: number[],
  topK: number = 5,
  filter?: Record<string, any>
) => {
  const index = await getOrCreateIndex(indexName);
  
  try {
    const queryOptions: any = {
      vector,
      topK,
      includeMetadata: true,
    };
    
    if (filter) {
      queryOptions.filter = filter;
    }

    const results = await index.query(queryOptions);

    return results;
  } catch (error) {
    console.error('Error querying vectors:', error);
    throw error;
  }
};

/**
 * Delete vectors from Pinecone
 * @param indexName - Name of the index
 * @param ids - Array of vector IDs to delete
 */
export const deleteVectors = async (
  indexName: string,
  ids: string[]
) => {
  const index = await getOrCreateIndex(indexName);
  
  try {
    await index.deleteMany(ids);
    console.log(`✅ Deleted ${ids.length} vectors from ${indexName}`);
    return { success: true, count: ids.length };
  } catch (error) {
    console.error('Error deleting vectors:', error);
    throw error;
  }
};

/**
 * Delete all vectors in an index (use with caution!)
 */
export const deleteAllVectors = async (indexName: string) => {
  const index = await getOrCreateIndex(indexName);
  
  try {
    await index.deleteAll();
    console.log(`✅ Deleted all vectors from ${indexName}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting all vectors:', error);
    throw error;
  }
};