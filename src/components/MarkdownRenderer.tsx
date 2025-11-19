'use client';

// Markdown レンダリングコンポーネント

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
          code({ node: _node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec((codeClassName as string) || '');
            const language = match ? match[1] : '';
            
            return !inline && match ? (
              <div className="mb-4 rounded-md overflow-hidden">
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-indigo-600" {...props}>
                {children}
              </code>
            );
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pre({ children }: any) {
            return <>{children}</>;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h1: ({ children }: any) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900">{children}</h1>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h2: ({ children }: any) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900">{children}</h2>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          h3: ({ children }: any) => <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900">{children}</h3>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p: ({ children }: any) => <p className="mb-4 leading-relaxed text-gray-700">{children}</p>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ul: ({ children }: any) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700">{children}</ul>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ol: ({ children }: any) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700">{children}</ol>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          li: ({ children }: any) => <li className="ml-4">{children}</li>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          blockquote: ({ children }: any) => (
            <blockquote className="border-l-4 border-indigo-500 pl-4 italic my-4 text-gray-700">
              {children}
            </blockquote>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          a: ({ href, children }: any) => (
            <a href={href as string} className="text-indigo-600 hover:text-indigo-800 underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          table: ({ children }: any) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-300">
                {children}
              </table>
            </div>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          thead: ({ children }: any) => <thead className="bg-gray-100">{children}</thead>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tbody: ({ children }: any) => <tbody>{children}</tbody>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tr: ({ children }: any) => <tr className="border-b border-gray-300">{children}</tr>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          th: ({ children }: any) => <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{children}</th>,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          td: ({ children }: any) => <td className="border border-gray-300 px-4 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

