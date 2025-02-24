// app/api/generate-summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PromptTemplate } from "@langchain/core/prompts";
import { geminiService } from '@/lib/google-ai-studio/gemini';


// TODO: Initiate Langfuse


// Create the RAG-aware summary prompt template
const summaryPrompt = PromptTemplate.fromTemplate(`
You are a helpful Google Cloud Platform technical expert. Based on the following relevant documentation excerpts,
provide a clear, accurate, and concise answer to the user's question. If the provided context doesn't fully
answer the question, acknowledge this and provide what information you can from the available context.

Context from GCP Documentation:
{context}

User Question: {question}

Please provide a technical summary that:
1. Directly answers the user's question using information from the documentation
2. Includes specific technical details and steps when available
3. Maintains technical accuracy without including information not present in the context
4. Acknowledges if any part of the question cannot be fully answered with the given context

Summary and Answer:`);

interface SearchResult {
  content: string;
  metadata?: {
    title?: string;
    section?: string;
  };
  score: number;
}

// TODO: Integrate Langfuse tracing of generation input and output
export async function POST(request: NextRequest) {
  try {
    const { query, context } = await request.json();

    if (!query) {
      return NextResponse.json({
        error: 'Query is required'
      }, { status: 400 });
    }

    if (!context || !Array.isArray(context)) {
      return NextResponse.json({
        error: 'Valid context array is required'
      }, { status: 400 });
    }

    // Format the context from search results
    const formattedContext = context
      .sort((a, b) => a.score - b.score) // Sort by relevance
      .map((result: SearchResult) => {
        const title = result.metadata?.title ? `Title: ${result.metadata.title}\n` : '';
        const section = result.metadata?.section ? `Section: ${result.metadata.section}\n` : '';
        return `${title}${section}Content: ${result.content}\n---\n`;
      })
      .join('\n');

    // Format the prompt
    const formattedPrompt = await summaryPrompt.format({
      question: query,
      context: formattedContext,
    });

    // Call the model
    console.log('Sending prompt to Vertex AI:', formattedPrompt);
    const result = await geminiService.generateContent(formattedPrompt);
    console.log('Received result from Vertex AI:', result);

    return NextResponse.json({ 
      summary: result,
      status: 'success' 
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate summary',
      status: 'error',
      details: process.env.NODE_ENV === 'development' ? {
        errorType: error instanceof Error ? error.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      } : undefined
    }, { status: 500 });
  }
}