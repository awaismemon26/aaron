import React from 'react';
import { ChevronDown, ChevronUp, Database, ExternalLink } from 'lucide-react';

interface ExtractedContent {
    url: string;
    status: 'success' | 'error';
    data?: string;
    error?: string;
}

interface ExtractedContentResultsProps {
    contents: ExtractedContent[];
    isLoading?: boolean;
    onIndex?: (content: ExtractedContent) => void;
    isIndexing?: { [key: string]: boolean };
}

const ExtractedContentResults: React.FC<ExtractedContentResultsProps> = ({
    contents,
    isLoading,
    onIndex,
    isIndexing = {}
}) => {
    const [expandedItems, setExpandedItems] = React.useState<number[]>([]);

    const toggleExpand = (index: number) => {
        setExpandedItems(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleIndexAll = () => {
        const successfulContents = contents.filter(
            content => content.status === 'success' && !isIndexing[content.url]
        );

        Promise.all(
            successfulContents.map(content => onIndex?.(content))
        ).catch(error => {
            console.error('Error indexing contents:', error);
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Extracted Content</h2>
                {contents.length > 0 && contents.some(c => c.status === 'success') && (
                    <button
                        onClick={handleIndexAll}
                        disabled={Object.keys(isIndexing).length > 0}
                        className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        <Database className="w-4 h-4" />
                        {Object.keys(isIndexing).length > 0 ? 'Indexing...' : 'Index All'}
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                            <div className="flex items-center justify-between mb-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                            </div>
                            <div className="mt-2">
                                <div className="h-32 bg-gray-200 rounded-lg w-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : contents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No content has been extracted yet.
                </div>
            ) : (
                <div className="space-y-4">
                    {contents.map((content, index) => (
                        <div
                            key={index}
                            className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                            <div className="flex items-center justify-between p-4">
                                <div
                                    className="flex items-center gap-3 flex-1 cursor-pointer"
                                    onClick={() => toggleExpand(index)}
                                >
                                    <a
                                        href={content.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {content.url}
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${content.status === 'success'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {content.status}
                                    </span>
                                    {content.status === 'success' && (
                                        <button
                                            onClick={() => onIndex?.(content)}
                                            disabled={isIndexing[content.url]}
                                            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                        >
                                            <Database className="w-4 h-4" />
                                            {isIndexing[content.url] ? 'Indexing...' : 'Index'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => toggleExpand(index)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        {expandedItems.includes(index) ? (
                                            <ChevronUp className="w-5 h-5" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {expandedItems.includes(index) && (
                                <div className="border-t border-gray-200">
                                    {content.status === 'success' ? (
                                        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 overflow-auto max-h-96">
                                            {content.data}
                                        </pre>
                                    ) : (
                                        <p className="text-red-600 text-sm p-4">{content.error}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ExtractedContentResults;