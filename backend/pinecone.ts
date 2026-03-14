import { Pinecone } from '@pinecone-database/pinecone';
import { EMBEDDING_DIMENSION } from './services/embeddingService.js';
import dotenv from 'dotenv';

dotenv.config();

let pineconeClient: Pinecone | null = null;
let indexCache: Map<string, any> = new Map();
let indexInitPromise: Promise<any> | null = null;

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

  console.log('Pinecone client initialized');
  return pineconeClient;
};

export const getOrCreateIndex = async (
  indexName: string = 'agentrag-notes',
  dimension: number = EMBEDDING_DIMENSION
) => {
  // If we have a cached index reference, return it
  if (indexCache.has(indexName)) {
    return indexCache.get(indexName);
  }

  // If initialization is already in progress, wait for it
  if (indexInitPromise) {
    await indexInitPromise;
    if (indexCache.has(indexName)) {
      return indexCache.get(indexName);
    }
  }

  // Start initialization with a promise to prevent race conditions
  indexInitPromise = (async () => {
    const pc = await initializePinecone();

    try {
      const indexes = await pc.listIndexes();
      const existingIndex = indexes.indexes?.find(index => index.name === indexName);

      if (existingIndex) {
        // Check if dimension matches
        if (existingIndex.dimension !== dimension) {
          console.warn(`⚠️  Index ${indexName} has wrong dimension: ${existingIndex.dimension} (expected ${dimension})`);
          console.log(`Deleting and recreating index with correct dimension...`);
          
          // Delete the existing index
          await pc.deleteIndex(indexName);
          console.log(`Deleted index ${indexName}`);
          
          // Wait for deletion to propagate
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Recreate with correct dimension
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
          
          console.log(`✅ Recreated index ${indexName} with dimension ${dimension}`);
        } else {
          console.log(`✅ Index ${indexName} exists with correct dimension (${dimension})`);
        }
      } else {
        console.log(`Creating index: ${indexName} with dimension ${dimension}`);
        
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
      }

      const index = pc.index(indexName);
      indexCache.set(indexName, index);
      return index;
    } catch (error: any) {
      // Handle "ALREADY_EXISTS" error gracefully - just use the index
      if (error.message?.includes('ALREADY_EXISTS') || error.code === 'ALREADY_EXISTS') {
        console.log(`Index ${indexName} exists (from concurrent request), using it`);
        const index = pc.index(indexName);
        indexCache.set(indexName, index);
        return index;
      }
      console.error('Error creating/accessing index:', error);
      throw error;
    }
  })();

  const result = await indexInitPromise;
  indexInitPromise = null;
  return result;
};

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
    console.log(`Upserted ${vectors.length} vectors to ${indexName}`);
    return { success: true, count: vectors.length };
  } catch (error) {
    console.error('Error upserting vectors:', error);
    throw error;
  }
};

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

export const deleteVectors = async (
  indexName: string,
  ids: string[]
) => {
  const index = await getOrCreateIndex(indexName);
  
  try {
    await index.deleteMany(ids);
    console.log(`Deleted ${ids.length} vectors from ${indexName}`);
    return { success: true, count: ids.length };
  } catch (error) {
    console.error('Error deleting vectors:', error);
    throw error;
  }
};

export const deleteAllVectors = async (indexName: string) => {
  const index = await getOrCreateIndex(indexName);
  
  try {
    await index.deleteAll();
    console.log(`Deleted all vectors from ${indexName}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting all vectors:', error);
    throw error;
  }
};