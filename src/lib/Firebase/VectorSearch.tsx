// src/lib/server/vectorSearch.ts
import {
  Firestore,
  VectorQuery,
  VectorQuerySnapshot
} from "@google-cloud/firestore";
import { EmbeddingService } from '@/app/api/indexing/embedding';
import { getDocument } from '@/lib/Firebase/Firestore';

export interface SearchResult {
  documentId: string;
  content: string;
  url: string;
  metadata: {
    title?: string;
    section?: string;
    documentUrl?: string;
  }
  score?: number;
}

export interface SearchOptions {
  limit: number;
  threshold: number;
}

export interface SearchResponse {
  results: SearchResult[];
  error?: string | null;
}


// // Initialize Firestore with vector search capabilities
const db = new Firestore({
  projectId: process.env.GCP_PROJECT_ID,
  //   keyFilename: process.env.GCP_KEY_FILE
});


export class VectorSearchUtil {
  private db: Firestore;
  private chunksCollection;
  private embeddingService: EmbeddingService;

  constructor() {
    // Initialize services
    this.db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID,
    });

    this.chunksCollection = this.db.collection('chunks');
    this.embeddingService = new EmbeddingService();
  }

  /**
     * Fetch original document details including URL
     */
  private async fetchDocumentDetails(documentId: string) {
    try {
      const doc = await getDocument('documents', documentId);
      if ('status' in doc || !doc) { // Check if it's a NextResponse or null
        console.warn(`Document not found for id: ${documentId}`);
        return null;
      }
      return doc.data;
    } catch (error) {
      console.error(`Error fetching document details for ${documentId}:`, error);
      return null;
    }
  }

  /**
   * Perform vector search with error handling
   */
  async performSearch(query: string, options: SearchOptions): Promise<SearchResponse> {
    try {
      // Validate query
      if (!query.trim()) {
        return {
          results: [],
          error: 'Query is required'
        };
      }

      console.log("NL Query running through vectsearch:", query);
      const queryEmbeddings = await this.embeddingService.getEmbeddings([query]);
      const queryVector = queryEmbeddings[0];

      // console.log("Embedded query vector created...");

      // Configure vector search query
      const vectorQuery: VectorQuery = this.chunksCollection.findNearest({
        queryVector: queryVector,
        vectorField: 'embedding',
        limit: options.limit,
        distanceMeasure: 'EUCLIDEAN',
        // distanceThreshold: options.threshold,
        distanceResultField: 'vector_distance'
      });

      // console.log("Running Vector Query: ", vectorQuery)

      // Execute search
      const vectorQuerySnapshot: VectorQuerySnapshot = await vectorQuery.get();

      // Filter for unique whole docs
      const uniqueDocsMap = new Map<string, any>();
      vectorQuerySnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const distance = doc.get('vector_distance');
        
        if (!uniqueDocsMap.has(data.documentId) || 
            distance < uniqueDocsMap.get(data.documentId).distance) {
          uniqueDocsMap.set(data.documentId, { doc, distance });
        }
      });

      // Process results and fetch document details
      const resultsPromises = Array.from(uniqueDocsMap.values()).map(async ({ doc }) => {
        const data = doc.data();
        const documentDetails = await this.fetchDocumentDetails(data.documentId);

        return {
          documentId: data.documentId,
          content: documentDetails?.content,
          url: documentDetails?.url || '',
          score: doc.get('vector_distance'),
          metadata: {
            ...data.metadata,
            documentUrl: documentDetails?.url,
          },
        };
      });

      const results = await Promise.all(resultsPromises);
      console.log(`Query returned ${results.length} results`);

      return {
        results: results.filter(result => result.url) // Only return results where we found the URL
      };

    } catch (error) {
      console.error('Vector search error:', error);
      return {
        results: [],
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Batch search multiple queries
   */
  async batchSearch(
    queries: string[],
    options: SearchOptions
  ): Promise<SearchResponse[]> {
    return Promise.all(
      queries.map(query => this.performSearch(query, options))
    );
  }

  /**
   * Search with additional context retrieval
   */
  async searchWithContext(
    query: string,
    options: SearchOptions
  ): Promise<SearchResponse> {
    const response = await this.performSearch(query, options);

    if (response.error || !response.results.length) {
      return response;
    }

    try {
      // Fetch additional context for each result
      const resultsWithContext = await Promise.all(
        response.results.map(async result => {
          const context = await this.fetchDocumentContext(result.documentId);
          return {
            ...result,
            metadata: {
              ...result.metadata,
              context
            }
          };
        })
      );

      return {
        results: resultsWithContext
      };

    } catch (error) {
      console.error('Error fetching context:', error);
      return {
        results: response.results,
        error: 'Failed to fetch additional context'
      };
    }
  }

  /**
   * Fetch additional context for a document
   */
  private async fetchDocumentContext(documentId: string): Promise<string> {
    try {
      const docRef = this.chunksCollection
        .where('documentId', '==', documentId)
        .orderBy('chunkIndex');

      const snapshot = await docRef.get();
      return snapshot.docs
        .map(doc => doc.data().content)
        .join('\n');
    } catch (error) {
      console.error('Error fetching document context:', error);
      return '';
    }
  }
}