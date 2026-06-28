import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';

const QDRANT_COLLECTION = 'project_embeddings';
// NVIDIA's recommended embedding model
const EMBEDDING_MODEL = 'nvidia/nv-embedqa-e5-v5';

class EmbeddingService {
  constructor() {
    this.qdrant = new QdrantClient({ url: 'http://127.0.0.1:6333' });
    this.initialized = false;
  }



  async initCollection() {
    if (this.initialized) return;
    try {
      const collections = await this.qdrant.getCollections();
      const exists = collections.collections.some(c => c.name === QDRANT_COLLECTION);
      
      if (!exists) {
        await this.qdrant.createCollection(QDRANT_COLLECTION, {
          vectors: {
            // NVIDIA nv-embedqa-e5-v5 outputs 1024 dimensions
            size: 1024,
            distance: 'Cosine'
          }
        });
        console.log(`✅ Qdrant Collection '${QDRANT_COLLECTION}' created.`);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Qdrant collection:', error.message);
    }
  }

  /**
   * Generates a vector embedding using direct fetch to NVIDIA API.
   * NVIDIA's asymmetric embedding models require 'input_type' at the root level.
   * The OpenAI SDK sanitizes unknown parameters, so we bypass it with raw fetch.
   * @param {string} text - Text to embed
   * @param {'passage'|'query'} inputType - 'passage' for file content, 'query' for user prompts
   */
  async createEmbedding(text, inputType = "passage") {
    const apiKey = process.env.NVIDIA_API_KEY;
    const response = await fetch('https://integrate.api.nvidia.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: "float",
        input_type: inputType
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${response.status} ${errText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  /**
   * Upserts a file into the Qdrant vector database
   */
  async upsertEmbedding(projectId, filePath, componentName, content) {
    try {
      await this.initCollection();

      // NVIDIA nv-embedqa-e5-v5 max input: 512 tokens.
      // Code tokens are very dense (often 1-2 chars per token).
      // Lowering to 1000 chars safely guarantees we stay under 512 tokens.
      const MAX_CHARS = 1000;
      const cleanContent = content.trim();
      const snippet = cleanContent.length > MAX_CHARS ? cleanContent.substring(0, MAX_CHARS) : cleanContent;
      const textToEmbed = `File: ${filePath}\nComponent: ${componentName}\n${snippet}`;
      const vector = await this.createEmbedding(textToEmbed, "passage");

      // Generate a deterministic UUID based on projectId and filePath
      const idHash = crypto.createHash('md5').update(`${projectId}_${filePath}`).digest('hex');
      // Convert md5 to a valid UUID format
      const uuid = `${idHash.substring(0,8)}-${idHash.substring(8,12)}-${idHash.substring(12,16)}-${idHash.substring(16,20)}-${idHash.substring(20,32)}`;

      await this.qdrant.upsert(QDRANT_COLLECTION, {
        wait: true,
        points: [
          {
            id: uuid,
            vector: vector,
            payload: {
              projectId: projectId.toString(),
              filePath,
              componentName,
              // Store a snippet, not the whole file, to save memory in Qdrant payload
              snippet: content.substring(0, 500)
            }
          }
        ]
      });
    } catch (error) {
      console.warn(`[EmbeddingService] Upsert embedding failed for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Searches for semantically relevant files
   */
  async searchRelevantFiles(projectId, query, limit = 10) {
    await this.initCollection();
    
    // User queries should use "query" input type for better accuracy in asymmetrical retrieval
    const queryVector = await this.createEmbedding(query, "query");

    const searchResults = await this.qdrant.search(QDRANT_COLLECTION, {
      vector: queryVector,
      limit: limit,
      filter: {
        must: [
          {
            key: "projectId",
            match: { value: projectId.toString() }
          }
        ]
      },
      with_payload: true,
      with_vector: false
    });

    return searchResults;
  }

  /**
   * Cleans up all vectors associated with a project
   */
  async deleteProjectEmbeddings(projectId) {
    await this.initCollection();
    await this.qdrant.delete(QDRANT_COLLECTION, {
      filter: {
        must: [
          {
            key: "projectId",
            match: { value: projectId.toString() }
          }
        ]
      }
    });
  }
}

export default new EmbeddingService();
