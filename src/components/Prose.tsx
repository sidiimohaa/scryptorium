import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for literary text (## titres, ### sous-titres, listes,
 * citations, **gras**, *italique*). Builds React nodes — no raw HTML is ever injected.
 */
export function Prose({ text, className = "", dropCap = true }: { text: string; className?: string; dropCap?: boolean }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={`prose-lit ${dropCap ? "" : "no-dropcap"} ${className}`}>
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) return <h3 key={i}>{inline(block.slice(4))}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{inline(block.slice(3))}</h2>;
        if (block.split("\n").every((l) => /^[-*] /.test(l)))
          return (
            <ul key={i}>
              {block.split("\n").map((l, j) => (
                <li key={j}>{inline(l.slice(2))}</li>
              ))}
            </ul>
          );
        if (block.startsWith("> "))
          return <blockquote key={i}>{inline(block.split("\n").map((l) => l.replace(/^> ?/, "")).join(" "))}</blockquote>;
        return (
          <p key={i}>
            {block.split("\n").map((line, j, arr) => (
              <Fragment key={j}>
                {inline(line)}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    out.push(tok.startsWith("**") ? <strong key={k++}>{tok.slice(2, -2)}</strong> : <em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
