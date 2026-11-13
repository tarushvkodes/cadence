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

type Block = { kind: 'p' | 'ul' | 'ol'; lines: string[] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/** Group lines into paragraphs and lists. A blank line or a switch between kinds starts a new block. */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    if (!raw.trim()) {
      blocks.push({ kind: 'p', lines: [] });
      continue;
    }
    const kind: Block['kind'] = BULLET.test(raw) ? 'ul' : NUMBERED.test(raw) ? 'ol' : 'p';
    const line = raw.replace(kind === 'ul' ? BULLET : kind === 'ol' ? NUMBERED : /^/, '');
    const prev = blocks.at(-1);
    if (prev && prev.kind === kind && prev.lines.length) prev.lines.push(line);
    else blocks.push({ kind, lines: [line] });
  }
  return blocks.filter((b) => b.lines.length);
}

export function Markdown({ text, caret = false }: { text: string; caret?: boolean }) {
  const blocks = toBlocks(text);
  const tailFor = (bi: number, li: number, count: number) =>
    caret && bi === blocks.length - 1 && li === count - 1 ? <span className="caret" aria-hidden="true" /> : null;

  return (
    <div className="markdown">
      {blocks.map((block, bi) => {
        if (block.kind === 'p') {
          return (
            <p key={bi}>
              {block.lines.map((l, li) => (
                <Fragment key={li}>
                  {li > 0 ? <br /> : null}
                  {inline(l, `${bi}-${li}`)}
                  {tailFor(bi, li, block.lines.length)}
                </Fragment>
              ))}
            </p>
          );
        }
        const List = block.kind;
        return (
          <List key={bi}>
            {block.lines.map((l, li) => (
              <li key={li}>
                {inline(l, `${bi}-${li}`)}
                {tailFor(bi, li, block.lines.length)}
              </li>
            ))}
          </List>
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
