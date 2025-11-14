'use client';

// Markdown レンダリングコンポーネント

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            return !inline && match ? (
              <pre className="mb-4 p-4 bg-gray-900 text-gray-100 rounded-md overflow-x-auto">
                <code className={`text-sm font-mono ${codeClassName || ''}`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-indigo-600" {...props}>
                {children}
              </code>
            );
          },
          pre({ children }: any) {
            return <>{children}</>;
          },
          h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900">{children}</h1>,
          h2: ({ children }: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900">{children}</h2>,
          h3: ({ children }: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h3>,
          p: ({ children }: any) => <p className="mb-4 leading-relaxed text-gray-700">{children}</p>,
          ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700">{children}</ul>,
          ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700">{children}</ol>,
          li: ({ children }: any) => <li className="ml-4">{children}</li>,
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-gray-700">
              {children}
            </blockquote>
          ),
          a: ({ href, children }: any) => (
            <a href={href} className="text-indigo-600 hover:text-indigo-800 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: any) => <thead className="bg-gray-100">{children}</thead>,
          tbody: ({ children }: any) => <tbody>{children}</tbody>,
          tr: ({ children }: any) => <tr className="border-b border-gray-300">{children}</tr>,
          th: ({ children }: any) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }: any) => <td className="border border-gray-300 px-4 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

