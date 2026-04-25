import React from 'react';
import { colors, fontSize, fontWeight } from '../../styles/tokens';

// ---------------------------------------------------------------------------
// Inline renderer: **bold**, `code`, plain text
// ---------------------------------------------------------------------------
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={i}>{token.slice(2, -2)}</strong>);
    } else {
      const inner = token.slice(1, -1);
      const isHex = /^#[0-9A-Fa-f]{6}$/.test(inner);
      parts.push(
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>
          {isHex && (
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: inner,
              border: '1px solid rgba(0,0,0,0.15)',
              flexShrink: 0,
            }} />
          )}
          <code style={{
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: '0.9em',
            fontFamily: 'monospace',
            color: colors.darkBlue,
          }}>{inner}</code>
        </span>
      );
    }
    lastIndex = match.index + token.length;
    i++;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  if (parts.length === 0) return '';
  if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Table parser
// ---------------------------------------------------------------------------
function parseTable(lines: string[]): React.ReactNode {
  const rows = lines.map(l =>
    l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
  );
  // row[1] is the separator row (---|---)
  const header = rows[0];
  const body = rows.slice(2);

  return (
    <div style={{ overflowX: 'auto', marginBottom: 20 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: fontSize.label }}>
        <thead>
          <tr style={{ backgroundColor: '#F8FAFC' }}>
            {header.map((cell, i) => (
              <th key={i} style={{
                border: `1px solid ${colors.border}`,
                padding: '8px 12px',
                textAlign: 'left',
                fontWeight: fontWeight.semibold,
                color: colors.black,
                whiteSpace: 'nowrap',
              }}>
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'white' : '#FAFAFA' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  border: `1px solid ${colors.border}`,
                  padding: '7px 12px',
                  color: colors.black,
                  verticalAlign: 'top',
                }}>
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block renderer
// ---------------------------------------------------------------------------
export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          backgroundColor: '#F8FAFC',
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          padding: '12px 16px',
          fontSize: 13,
          fontFamily: 'monospace',
          overflowX: 'auto',
          marginBottom: 16,
          color: colors.black,
          lineHeight: 1.6,
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: `1px solid ${colors.border}`, margin: '24px 0' }} />);
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ fontSize: 26, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 16, marginTop: i === 0 ? 0 : 32 }}>
          {renderInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: 20, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 12, marginTop: 28 }}>
          {renderInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 8, marginTop: 20 }}>
          {renderInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // H4
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={i} style={{ fontSize: fontSize.label, fontWeight: fontWeight.semibold, color: colors.black, marginBottom: 6, marginTop: 16 }}>
          {renderInline(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // Table (starts with |)
    if (line.startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<React.Fragment key={i}>{parseTable(tableLines)}</React.Fragment>);
      continue;
    }

    // Unordered list
    if (/^[-*] /.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} style={{ paddingLeft: 20, marginBottom: 16 }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ fontSize: fontSize.body, color: colors.black, lineHeight: 1.7, marginBottom: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\. /, ''));
        i++;
      }
      elements.push(
        <ol key={i} style={{ paddingLeft: 20, marginBottom: 16 }}>
          {listItems.map((item, j) => (
            <li key={j} style={{ fontSize: fontSize.body, color: colors.black, lineHeight: 1.7, marginBottom: 4 }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={i} style={{
          borderLeft: `3px solid ${colors.border}`,
          paddingLeft: 16,
          marginLeft: 0,
          marginBottom: 16,
          color: colors.gray,
        }}>
          {quoteLines.map((ql, j) => (
            <p key={j} style={{ fontSize: fontSize.body, lineHeight: 1.7, margin: 0 }}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Italic-only line starting with * (footnote style)
    if (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**')) {
      elements.push(
        <p key={i} style={{ fontSize: fontSize.label, color: colors.gray, fontStyle: 'italic', marginBottom: 8 }}>
          {line.slice(1, -1)}
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} style={{ fontSize: fontSize.body, color: colors.black, lineHeight: 1.7, marginBottom: 12 }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
}
