import { Fragment } from "react";

const TABLE_SEPARATOR = /^:?-{3,}:?$/;

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => TABLE_SEPARATOR.test(cell));
}

function safeLink(href) {
  return /^(https?:\/\/|mailto:|\/|#)/i.test(href) ? href : null;
}

function renderInline(value, keyPrefix = "inline") {
  const source = String(value ?? "");
  const tokenPattern = /(\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([\s\S]+?)\*\*|__([\s\S]+?)__|\*([^*]+)\*|_([^_]+)_)/g;
  const output = [];
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(source)) !== null) {
    if (match.index > cursor) {
      output.push(source.slice(cursor, match.index));
    }

    if (match[2] && match[3]) {
      const href = safeLink(match[3]);
      output.push(
        href ? (
          <a key={`${keyPrefix}-link-${match.index}`} href={href} target="_blank" rel="noreferrer">
            {renderInline(match[2], `${keyPrefix}-link-text-${match.index}`)}
          </a>
        ) : (
          <Fragment key={`${keyPrefix}-unsafe-link-${match.index}`}>{match[2]}</Fragment>
        ),
      );
    } else if (match[4]) {
      output.push(<code key={`${keyPrefix}-code-${match.index}`}>{match[4]}</code>);
    } else if (match[5] || match[6]) {
      output.push(<strong key={`${keyPrefix}-strong-${match.index}`}>{match[5] || match[6]}</strong>);
    } else if (match[7] || match[8]) {
      output.push(<em key={`${keyPrefix}-em-${match.index}`}>{match[7] || match[8]}</em>);
    }

    cursor = tokenPattern.lastIndex;
  }

  if (cursor < source.length) {
    output.push(source.slice(cursor));
  }

  return output.length ? output : source;
}

function renderTable(block, blockIndex) {
  return (
    <div className="assistant-markdown-table-wrap" key={`table-${blockIndex}`}>
      <table>
        <thead>
          <tr>
            {block.headers.map((header, index) => (
              <th scope="col" key={`header-${index}`}>
                {renderInline(header, `header-${blockIndex}-${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {block.headers.map((_, columnIndex) => (
                <td key={`cell-${rowIndex}-${columnIndex}`}>
                  {renderInline(row[columnIndex] || "", `cell-${blockIndex}-${rowIndex}-${columnIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function collectList(lines, startIndex) {
  const firstMatch = lines[startIndex].match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
  if (!firstMatch) return null;

  const ordered = /^\d/.test(firstMatch[1]);
  const items = [];
  let index = startIndex;

  while (index < lines.length) {
    const match = lines[index].match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
    if (!match || /^\d/.test(match[1]) !== ordered) break;
    items.push(match[2]);
    index += 1;
  }

  return { ordered, items, nextIndex: index };
}

function parseBlocks(markdown) {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", lines: paragraph });
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);

    if (fence) {
      flushParagraph();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", language: fence[1], value: codeLines.join("\n") });
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      blocks.push({ type: "heading", level: heading[1].length, value: heading[2] });
      index += 1;
      continue;
    }

    if (/^\s*(\*\s*){3,}$/.test(line) || /^\s*(-\s*){3,}$/.test(line) || /^\s*_{3,}\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ type: "rule" });
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes("|") && isTableSeparator(lines[index + 1])) {
      flushParagraph();
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim() && lines[index].includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const list = collectList(lines, index);
    if (list) {
      flushParagraph();
      blocks.push({ type: "list", ...list });
      index = list.nextIndex;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const quoteLines = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  return blocks;
}

function AssistantMarkdown({ content }) {
  const blocks = parseBlocks(content);

  return (
    <div className="assistant-markdown">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          const Heading = `h${Math.min(block.level + 1, 6)}`;
          return <Heading key={`heading-${blockIndex}`}>{renderInline(block.value, `heading-${blockIndex}`)}</Heading>;
        }

        if (block.type === "code") {
          return (
            <pre key={`code-${blockIndex}`}>
              {block.language && <span className="assistant-code-language">{block.language}</span>}
              <code>{block.value}</code>
            </pre>
          );
        }

        if (block.type === "table") return renderTable(block, blockIndex);
        if (block.type === "rule") return <hr key={`rule-${blockIndex}`} />;

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={`list-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`item-${itemIndex}`}>{renderInline(item, `list-${blockIndex}-${itemIndex}`)}</li>
              ))}
            </List>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={`quote-${blockIndex}`}>
              {block.lines.map((line, lineIndex) => (
                <Fragment key={`quote-line-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {renderInline(line, `quote-${blockIndex}-${lineIndex}`)}
                </Fragment>
              ))}
            </blockquote>
          );
        }

        return (
          <p key={`paragraph-${blockIndex}`}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={`paragraph-line-${lineIndex}`}>
                {lineIndex > 0 && <br />}
                {renderInline(line, `paragraph-${blockIndex}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export { AssistantMarkdown };
