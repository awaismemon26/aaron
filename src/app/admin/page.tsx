"use client"

import React, { useState } from 'react';
import URLManager from '@/app/components/AdminPanel/URLManager';
import { DocumentList, DocumentListSkeleton } from '@/app/components/AdminPanel/DocumentList';
import ExtractedContentResults from '@/app/components/AdminPanel/ExtractedContentResults';

// Types
interface Document {
  id: string;
  url: string;
  indexedAt: string;
  status: 'indexed' | 'failed' | 'pending';
}

interface ExtractedContent {
  url: string;
  status: 'success' | 'error';
  data?: string;
  error?: string;
}

const AdminPanel = () => {
  // State
  const [urls, setUrls] = useState('');
  const [entityDescription, setEntityDescription] = useState('');
  const [isIndexing, setIsIndexing] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string>();
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [extractedContents, setExtractedContents] = useState<ExtractedContent[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtractContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setIsExtracting(true);

    try {
      const urlList = urls.split('\n')
        .map(url => url.trim())
        .filter(url => url);

      console.log('sending to /api/content-extraction: ' + JSON.stringify({ urls: urlList }))

      const response = await fetch('/api/content-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: urlList, entityDescription }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error('Failed to extract content from response: ', error.error || 'Failed to extract content');
      }

      const result = await response.json();
      setExtractedContents(result.results);

    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleIndex = async (content: ExtractedContent) => {
    if (!content.data || !content.url) return;

    setIsIndexing(prev => ({ ...prev, [content.url]: true }));
    setError(undefined);

    try {
      const response = await fetch('/api/indexing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: [content.url],
          extractedContent: content.data
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to index content');
      }

      const result = await response.json();
      setDocuments(prev => [...prev, ...result.documents]);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsIndexing(prev => ({ ...prev, [content.url]: false }));
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/indexing/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (error) {
    }
  };

  const refreshDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const response = await fetch('/api/indexing');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents);
      setIsLoadingDocs(false);
    } catch (error) {
      console.error('Error refreshing documents:', error);
    }
  };

  // Initial load
  React.useEffect(() => {
    refreshDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Knowledge Scraper Panel</h1>

        <URLManager
          urls={urls}
          entityDescription={entityDescription}
          onUrlsChange={setUrls}
          onEntityDescriptionChange={setEntityDescription}
          onSubmit={handleExtractContent}
          onClear={() => setUrls('')}
          error={error}
          isSubmitting={isExtracting}
        />

        <ExtractedContentResults
          contents={extractedContents}
          isLoading={isExtracting}
          onIndex={handleIndex}
          isIndexing={isIndexing}
        />

        {/* Document List */}
        {isLoadingDocs ? (
          <DocumentListSkeleton />
        ) : (
          <DocumentList
            documents={documents}
            onDelete={handleDeleteDocument}
          />
        )}

      </div>
    </div>
  );
};

export default AdminPanel;