import { Fragment } from "react";

// Just enough Markdown for the content files: blank lines start a new paragraph,
// and [text](url) makes a link.
function renderInline(text: string) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return link ? <a key={i} href={link[2]}>{link[1]}</a> : <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{renderInline(para.trim())}</p>
      ))}
    </>
  );
}
