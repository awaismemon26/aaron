1|## Challenge 2: Create Knowledge Base - "The Library Builder" 📚
2|
4|
3|**Mission:**  Welcome back! For your second mission, you'll step into the role of "The Library Builder".  Aaron the  intern needs a brain, and that brain will be a knowledge base of the content you scraped and extracted in the first challenge. In this challenge, you'll learn how to ingest this data into [Firestore](https://cloud.google.com/firestore/docs/overview), break it down into manageable pieces (chunks), create dense text embeddings, store these embeddings and finally make them searchable.  This process will transform raw text into a searchable, AI-ready knowledge base.

In case you have never worked with text embeddings and RAG before, or you need a refresher check out [our documentation](https://cloud.google.com/use-cases/retrieval-augmented-generation?hl=en).

5|**Learning Objectives:**
6|
7|*   **Chunking Strategies:** Explore different techniques to divide large documents into smaller, semantically meaningful chunks. Understand how chunk size and overlap affect search relevance.
8|*   **Embedding Creation:** Learn how text embeddings are generated using the Gemini API and their crucial role in semantic search. Grasp the concept of vector representations of text.
9|*   **Embedding Storage:**  Get hands-on experience with storing embeddings in Firestore, which acts as our vector database for this lab.
10|
11|**Key Technologies & Concepts:**
12|
13|*   **Next.js:**  Building the frontend and backend logic for our indexing process.
14|*   **Firestore:**  Utilizing Firestore as a document and vector database to store document chunks and their embeddings.
15|*   **Gemini API (via `EmbeddingService`):**  Leveraging the Gemini API to generate embeddings for our document chunks. See `src/app/api/indexing/embedding.tsx` for implementation details.
16|*   **Chunking Algorithms (`DocumentChunker`):** Implementing strategies to split documents into chunks.  Examine `src/app/api/indexing/chunking.tsx` and `src/app/api/indexing/processing.tsx` for the chunking logic.
18|

## Step 1: Explore the Codebase 🕵️‍♀️

Let's dive into the key components of our indexing pipeline. This system is designed to take the extracted content, chunk it into manageable pieces, generate embeddings, and store everything in Firestore.

### Core Components

1. **Admin Panel (`src/app/admin/page.tsx`)**
   - Main control center for the indexing process
   - Key state management:
   - Critical functions:
     - `handleIndex`: Initiates the indexing process for extracted content - this method contains the front end indexing logic

2. **Extracted Content Results (`src/app/components/AdminPanel/ExtractedContentResults.tsx`)**
   - Component that displays the results of content extraction
   - Provides "Index" button for each successfully extracted document
   - Shows expandable previews of extracted content

3. **Document Processor (`src/app/api/indexing/route.tsx`)**
    - This is the indexing route that is called from the frontend to orchestrate the content indexing

3. **Document Processor (`src/app/api/indexing/processing.tsx`)**
   - This is the orchestrator of our indexing pipeline - Here you find the crucial indexing logic and makes calls to the required services for sub steps.
   - Manages the entire flow from content extraction to embedding storage
   - Key methods:
     - `processDocument`: Handles the complete indexing workflow
     - `processEmbeddings`: Manages batch processing of embeddings with retry logic

4. **Document Chunker (`src/app/api/indexing/chunking.tsx`)**
   - Uses `RecursiveCharacterTextSplitter` from LangChain
   - Splits documents into semantic chunks while preserving context
   - Default configuration:
     - Chunk size: 500 characters
     - Overlap: 30 characters

5. **Embedding Service (`src/app/api/indexing/embedding.tsx`)**
   - Interfaces with Google's Vertex AI for embedding generation
   - Uses the text-embedding-005 model
   - Handles batch processing with configurable batch sizes
   - Includes retry logic for reliability


## Step 2: Implement Document Chunking 📄

Now that you understand the codebase, let's implement the chunking strategy for our knowledge base. We'll use LangChain's [RecursiveCharacterTextSplitter](https://js.langchain.com/docs/concepts/text_splitters/#text-structured-based) to break down documents into semantic chunks while preserving context.

#### Why Do We Need Chunking? 🤔

Before diving into implementation, let's understand why chunking is crucial:
- Handle varying document lengths consistently
- Stay within model token limits
- Improve embedding quality and retrieval precision
- Optimize computational resources

[Learn more about chunking strategies](https://js.langchain.com/docs/concepts/text_splitters/#overview)

#### Your Task: Implement the DocumentChunker 🛠️

Follow the method calls starting at `src/app/api/indexing/processing.tsx` for the chunking. Find the Chunking implementaiton and fix it.


## Step 3: Configure Text Embeddings 🧬

Now that we have our chunking strategy in place, let's set up the embedding generation using Google's Text Embedding model. Embeddings are crucial for our knowledge base as they convert text into numerical vectors that capture semantic meaning.

### Understanding Embeddings

Before diving into implementation, let's understand what embeddings are:
- Embeddings are dense vector representations of text that capture semantic relationships
- They convert sparse, high-dimensional data (like one-hot encoded text) into dense, lower-dimensional vectors
- [Learn more about embeddings and their importance](https://developers.google.com/machine-learning/crash-course/embeddings)

### Available Embedding Models

Google provides multiple embedding models. Review the documentation below and evaluate the best embedding model to use.
   - [Embedding Models in Gemini API](https://ai.google.dev/gemini-api/docs/models/gemini#text-embedding-and-embedding)
   - [Text Embeddings in Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-text-embeddings)
   - [Multimodal Embeddings in Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings)

### Your Task: Configure the Embedding Service

Follow the indexing logic in `src/app/api/indexing/processing.tsx`, locate the embedding generation implementation and complete it with the missing model identifier.


## Step 4: Run and Verify the Indexing Pipeline 🚀

Now that we have implemented chunking and configured embeddings, let's run the complete indexing pipeline and verify our data in Firestore.

### Running the Pipeline

1. **Start the Development Server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the Admin Panel:**
   - Open `http://localhost:3000/admin`
   - You should see the "Knowledge Scraper Panel"

3. **Add Documentation URLs:**
   - Copy on eor several GCP documentation URLs
   - Paste them into the "URLs" text area in the Admin Panel
   - Add a description such as "GCP Documentation in it's original wording in english language"

4. **Extract Content:**
   - Click "Get Target Content"
   - Watch the extraction progress in the "Extracted Content Results" section
   - You can expand each result to preview the extracted content

5. **Start Indexing:**
   - For each successfully extracted document, click the "Index" button (<Database /> icon)
   - Monitor the console logs for progress:
   ```
   #### Scraped and stored ####
   🟦 Creating chunks from content...
   🟦 Created X chunks
   #### Chunked ####
   #### Chunks stored ####
   #### Embedded ####
   #### Fully indexed ####
   ```

### Verifying in Firestore Console

1. **Access Firestore:**
   - Open the [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to Firestore Database
   - Select your project

2. **Examine Collections:**
   - You should find two collections in your Firestore DB "documents" and chunks
   - Examine the data they contain. Can you find the embedded text?

3. **Verify Vector Search Index:**
   - In Firestore, navigate to "Indexes"
   - Look for the vector index on the `chunks` collection
   - Confirm index configuration:
     ```terraform
     fields {
       field_path = "embedding"
       vector_config {
         dimension = 768
         flat {}
       }
     }
     ```

Great Job! Add as many more documents as you like and play around with the indexing pipeline to improve your understanding.