// src/app/api/indexing/processing.tsx
import {
  ChunkFields,
  DocumentFields,
  BatchConfig,
  DocumentIdGenerator
} from '@/lib/Firebase/types';
import {
  updateDocument,
  uploadChunkBatch,
  batchUpdateDocuments
} from '@/lib/Firebase/Firestore';
import { EmbeddingService } from './embedding';

import {
  // Firestore,
  FieldValue,
} from "@google-cloud/firestore";

import { DocumentScraper } from '@/app/api/indexing/scraping'
import { DocumentChunker } from '@/app/api/indexing/chunking'
import { Timestamp } from "@google-cloud/firestore";


export class ProcessingError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ProcessingError';
  }
}

const docScraper = new DocumentScraper();

const docChunker = new DocumentChunker();


const generateChunkId: DocumentIdGenerator = (documentId: string, chunkIndex: number) => {
  return `${documentId}-chunk-${chunkIndex}`;
}


export class DocumentProcessor {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  /**
   * Process a single document through the chunking and embedding pipeline
   */
  async processDocument(doc: { id: string; data: DocumentFields }, extractedContent?: string): Promise<void> {
    try {
      await updateDocument<DocumentFields>('documents', doc.id, {
        status: 'processing',
        error: undefined
      });
  
      // Use extracted content if provided, otherwise scrape
      let content;
      if (extractedContent) {
        content = {
          cleanHTML: extractedContent,
          rawHTML: extractedContent
        };
      } else {
        content = await docScraper.scrapeUrl(doc.data.url);
      }
  
      if (!content) {
        throw new ProcessingError('No valid content available');
      }
  
      await updateDocument<DocumentFields>('documents', doc.id, {
        content: content.cleanHTML,
        rawHTML: content.rawHTML
      });

      console.log('#### Scraped and stored ####')

      // Step 3: Create chunks from content
      console.log('🟦 Creating chunks from content...');
      // const chunks = this.createChunks(scrapedContent);
      const chunks =  await docChunker.chunkText(content.cleanHTML);
      console.log(`🟦 Created ${chunks.length} chunks`);
      if (chunks.length > 0) {
        console.log('🟦 Sample chunk sizes:', chunks.slice(0, 3).map(chunk => chunk.length));
        console.log('🟦 First chunk preview:', chunks[0].substring(0, 200));
      }
      console.log('#### Chunked ####');

      const chunksWithMetadata: ChunkFields[] = chunks.map((chunk, index) => ({
        documentId: doc.id,
        chunkId: generateChunkId(doc.id, index),
        content: chunk || ' ',
        chunkIndex: index,
        totalChunks: chunks.length,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }));

      console.log('#### Chunked ####')

      // Step 3: Store chunks without embeddings first
      const chunkBatchConfig: BatchConfig<ChunkFields> = {
        colId: 'chunks',
        batchSize: 500,
        baseFields: {
          documentId: doc.id,
          embedding: FieldValue.vector([])
        }
      };

      const storedChunksResponse = await uploadChunkBatch<ChunkFields>(
        chunksWithMetadata,
        chunkBatchConfig
      );

      if (!storedChunksResponse.success) {
        throw new ProcessingError('Failed to store chunks', storedChunksResponse.error);
      }
      console.log('#### Chunks stored ####')

      // Step 4: Process embeddings in smaller batches
      await this.processEmbeddings(
        chunksWithMetadata,
      );
      console.log('#### Embedded ####')

      // Step 5: Update document status to complete
      await updateDocument<DocumentFields>('documents', doc.id, {
        status: 'indexed',
        indexedAt: Timestamp.now()
      });

      console.log('#### Fully indexed ####')

    } catch (error) {
      console.error(`Error processing document ${doc.id}:`, error);
      await updateDocument<DocumentFields>('documents', doc.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process embeddings in batches with retry logic
   */
  private async processEmbeddings(
    chunks: ChunkFields[],
    batchSize: number = 50
  ): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 10000;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      let retries = 0;
      let success = false;

      while (!success && retries < maxRetries) {
        try {
          // Generate embeddings for the batch
          const embeddings = await this.embeddingService.getEmbeddings(
            batch.map(chunk => chunk.content)
          );

          // Update each chunk with its embedding
          await batchUpdateDocuments<ChunkFields>('chunks',
            batch.map((chunk, j) => ({
              id: chunk.chunkId,
              updatedFields: { embedding: FieldValue.vector(embeddings[j]) }
            }))
          );

          success = true;
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            throw new ProcessingError(
              `Failed to process embeddings after ${maxRetries} attempts`,
              { error, batchStart: i, batchSize }
            );
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
        }
      }

      // Optional: Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Create chunks from document content
   */
  private createChunks(content: string, maxChunkSize: number = 1000): string[] {
    if (!content) return [];

    // Split content into meaningful sections
    const sections = content
      .split(/\n\n+/)
      .map(section => section.trim())
      .filter(section => section.length > 0);

    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of sections) {
      // If adding this section would exceed maxChunkSize, save current chunk and start new one
      if (currentChunk && (currentChunk.length + section.length + 2) > maxChunkSize) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = section;
      } else {
        // Add to current chunk with proper spacing
        currentChunk = currentChunk
          ? currentChunk + '\n\n' + section
          : section;
      }
    }

    // Don't forget the last chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

// Export a singleton instance
export const documentProcessor = new DocumentProcessor();