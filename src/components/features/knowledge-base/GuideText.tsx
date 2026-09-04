import type { ReactNode } from 'react';

/** Renders training copy with **bold** UI labels. */
export function GuideText({ text, className }: { text: string; className?: string }) {
  const nodes: ReactNode[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  parts.forEach((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      nodes.push(
        <strong key={index} className="font-semibold text-gray-900">
          {bold[1]}
        </strong>
      );
      return;
    }
    const code = part.match(/^`([^`]+)`$/);
    if (code) {
      nodes.push(
        <code key={index} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em] text-gray-800">
          {code[1]}
        </code>
      );
      return;
    }
    if (part) nodes.push(<span key={index}>{part}</span>);
  });
  return <span className={className}>{nodes}</span>;
}
