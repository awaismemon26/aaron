import React, { useEffect } from 'react';
import { Trash2, ExternalLink } from 'lucide-react';

interface Document {
  id: string;
  url: string;
  indexedAt: { seconds: number; nanoseconds: number } | string;
  status: 'indexed' | 'failed' | 'pending';
  data?: {
    url?: string;
    indexedAt?: { seconds: number; nanoseconds: number };
    status?: 'indexed' | 'failed' | 'pending';
  };
}

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

const formatDate = (dateValue: any): string => {
  if (!dateValue) return 'Not available';
  
  // Handle Firestore Timestamp object
  if (typeof dateValue === 'object' && 'seconds' in dateValue) {
    return new Date(dateValue.seconds * 1000).toLocaleString();
  }
  
  // Handle string dates
  if (typeof dateValue === 'string') {
    return new Date(dateValue).toLocaleString();
  }
  
  return 'Invalid date';
};

const getDocumentUrl = (doc: Document): string => {
  // Check both top-level and nested url
  return doc.url || doc.data?.url || 'URL not available';
};

const getDocumentStatus = (doc: Document): string => {
  // Check both top-level and nested status
  return doc.status || doc.data?.status || 'pending';
};

const cleanDocumentId = (id: string): string => {
  if (!id) return 'Unknown';
  return id
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onDelete }) => {
  useEffect(() => {
    console.log('DocumentList documents:', documents);
  }, [documents]);

  if (!Array.isArray(documents)) {
    console.error('Invalid documents prop:', documents);
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <p className="text-red-600">Error: Invalid documents data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Indexed Documents</h2>
        <span className="text-sm text-gray-500">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No documents have been indexed yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indexed At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => {
                const url = getDocumentUrl(doc);
                const status = getDocumentStatus(doc);
                const indexedAt = doc.indexedAt || doc.data?.indexedAt;

                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {url !== 'URL not available' ? (
                        <a 
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          {cleanDocumentId(doc.id)}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-500">{cleanDocumentId(doc.id)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(indexedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${status === 'indexed' ? 'bg-green-100 text-green-800' :
                          status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Remove document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


// Optional loading state component
export const DocumentListSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 mt-8">
    <div className="flex items-center justify-between mb-4">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  </div>
);