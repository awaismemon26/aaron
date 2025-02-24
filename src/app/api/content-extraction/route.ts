import { NextRequest, NextResponse } from 'next/server';
import { DocumentScraper } from '../indexing/scraping';
import { initializeGeminiService } from '@/lib/google-ai-studio/gemini';
import { PromptTemplate } from "@langchain/core/prompts";

const docScraper = new DocumentScraper();

// Create extraction prompt template
const extractionPrompt = PromptTemplate.fromTemplate(`
You are a specialized content extraction expert. Your task is to analyze HTML content and extract relevant information based on the given entity description.

Entity Description:
{entityDescription}

Raw HTML Content:
{htmlContent}

Instructions:
1. Analyze the HTML content and identify sections that match the follwing entity description
Entity Description:
{entityDescription}

2. Extract the full original content, maintaining its complete original structure
3. Remove any navigation elements, or boilerplate text
4. Preserve important technical details, code snippets, and documentation specifics
5. Format the output as clean, structured text string
6. Do not summarize the content but return the full text as it was given in the original
7. Make sure to evaluate each part of the html input to not miss any parts of the sought after information
8. Return the cleaned up text content and not the HTML code.

Extracted Text:
`);

export async function POST(request: NextRequest) {
  try {
    const { urls, entityDescription } = await request.json();
    console.log("Content Extraction for: ", urls, entityDescription)
    const geminiService = initializeGeminiService("gemini-2.0-flash");

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({
        error: 'Valid URLs array is required'
      }, { status: 400 });
    }

    if (!entityDescription) {
      return NextResponse.json({
        error: 'Entity description is required'
      }, { status: 400 });
    }

    const results = await Promise.all(urls.map(async (url) => {
      try {
        // Scrape the URL
        const scrapedContent = await docScraper.scrapeUrl(url);

        // console.log("Scraped Content (" , url ,"): ", scrapedContent)

        // Format the prompt
        const formattedPrompt = await extractionPrompt.format({
          entityDescription,
          htmlContent: scrapedContent.rawHTML,
        });

        // Get structured response from Gemini
        const extractionResult = await geminiService.generateWithRetry(formattedPrompt);

        // console.log('Extraction Result:', extractionResult);

        return {
          url,
          status: 'success',
          data: extractionResult,
        };

      } catch (error) {
        console.error(`Error processing URL ${url}:`, error);
        return {
          url,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to process URL'
        };
      }
    }));

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Content extraction error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to extract content',
      status: 'error'
    }, { status: 500 });
  }
}