import { Fragment, type ReactNode } from 'react';

/** Just enough Markdown for the agent's replies: paragraphs, bullet and numbered lists, bold, italics. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    out.push(token.startsWith('**') ? <strong key={`${keyBase}-${i++}`}>{token.slice(2, -2)}</strong> : <em key={`${keyBase}-${i++}`}>{token.slice(1, -1)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text, caret = false }: { text: string; caret?: boolean }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className="markdown">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim());
        const isLast = bi === blocks.length - 1;
        const tail = caret && isLast ? <span className="caret" aria-hidden="true" /> : null;
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>
                  {inline(l.replace(/^\s*[-*•]\s+/, ''), `${bi}-${li}`)}
                  {li === lines.length - 1 ? tail : null}
                </li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={bi}>
              {lines.map((l, li) => (
                <li key={li}>
                  {inline(l.replace(/^\s*\d+[.)]\s+/, ''), `${bi}-${li}`)}
                  {li === lines.length - 1 ? tail : null}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 ? <br /> : null}
                {inline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
            {tail}
          </p>
        );
      })}
      {blocks.length === 0 && caret ? (
        <p>
          <span className="caret" aria-hidden="true" />
        </p>
      ) : null}
    </div>
  );
}
