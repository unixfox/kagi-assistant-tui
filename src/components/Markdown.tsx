import { Box, Text, Code } from "@opentui/react";
import { marked, type Tokens, type Token } from "marked";
import { RGBA, SyntaxStyle } from "@opentui/core";

// Define a theme interface for easy customization
interface MarkdownTheme {
  h1: { fg: string; bold: boolean; underline: boolean };
  h2: { fg: string; bold: boolean };
  h3: { fg: string; bold: boolean };
  h4: { fg: string };
  h5: { fg: string };
  h6: { fg: string };
  link: { fg: string; underline: boolean };
  blockquote: { fg: string; borderLeftColor: string };
  codeBlock: { borderColor: string };
  inlineCode: { fg: string; bg: string };
  details: { fg: string; italic: boolean; fontSize: number };
}

interface DetailsBlock {
  summary: string;
  content: string;
  position: number; // Position in original content
}

const defaultTheme: MarkdownTheme = {
  h1: { fg: "#ff007c", bold: true, underline: true }, // Magenta/Pinkish
  h2: { fg: "#00d7ff", bold: true }, // Cyan
  h3: { fg: "#ffff00", bold: true }, // Yellow
  h4: { fg: "#ffffff" },
  h5: { fg: "#aaaaaa" },
  h6: { fg: "#888888" },
  link: { fg: "#5ea1ff", underline: true },
  blockquote: { fg: "#808080", borderLeftColor: "#666" },
  codeBlock: { borderColor: "#444" },
  inlineCode: { fg: "#ff79c6", bg: "#2d2d2d" },
  details: { fg: "#666666", italic: true, fontSize: 0 }, // Gray, italic for thinking content
};

interface MarkdownProps {
  content: string;
  theme?: Partial<MarkdownTheme>;
}

const Markdown = ({ content, theme: userTheme }: MarkdownProps) => {
  const theme = { ...defaultTheme, ...userTheme };

  // Extract <details> blocks before parsing markdown
  const extractDetailsBlocks = (
    content: string,
  ): { cleanedContent: string; detailsBlocks: DetailsBlock[] } => {
    const detailsRegex = /<details>([\s\S]*?)<\/details>/g;
    const detailsBlocks: DetailsBlock[] = [];

    // Extract all details blocks first, tracking their positions
    let match;
    while ((match = detailsRegex.exec(content)) !== null) {
      const fullContent = match[1];
      const position = match.index; // Position where this details block starts

      // Extract summary and content
      const summaryMatch = fullContent.match(/<summary>([\s\S]*?)<\/summary>/);
      const summary = summaryMatch ? summaryMatch[1].trim() : "Details";
      const contentAfterSummary = summaryMatch
        ? fullContent.replace(/<summary>[\s\S]*?<\/summary>/, "")
        : fullContent;

      detailsBlocks.push({
        summary,
        content: contentAfterSummary.trim(),
        position,
      });
    }

    // Remove details blocks from the content and insert placeholders
    const cleanedContent = content.replace(detailsRegex, "").trim();

    return { cleanedContent, detailsBlocks };
  };

  const { cleanedContent, detailsBlocks } = extractDetailsBlocks(content);
  const tokens = marked.lexer(cleanedContent);

  // Helper to render inline elements (bold, italic, links, inline code) inside a <text> tag
  const renderInline = (tokens?: Token[]): React.ReactNode[] => {
    if (!tokens) return [];

    return tokens.map((token, index) => {
      const key = `${token.type}-${index}`;

      switch (token.type) {
        case "text":
          // Handle decoded text entities if necessary, though TUI usually handles raw strings well
          return (token as Tokens.Text).text;

        case "strong":
          return (
            <strong key={key}>
              {renderInline((token as Tokens.Strong).tokens)}
            </strong>
          );

        case "em":
          return <em key={key}>{renderInline((token as Tokens.Em).tokens)}</em>;

        case "codespan":
          return (
            <span key={key} fg={theme.inlineCode.fg} bg={theme.inlineCode.bg}>
              {(token as Tokens.Codespan).text}
            </span>
          );

        case "link":
          // TUI doesn't support clickable links natively in standard terminals easily,
          // but we can style them.
          return (
            <span key={key} fg={theme.link.fg} underline={theme.link.underline}>
              {(token as Tokens.Link).text}
            </span>
          );

        case "br":
          return "\n";

        default:
          return (token as any).text || "";
      }
    });
  };

  // Helper to render Block elements
  const renderBlock = (token: Token, index: number) => {
    const key = `${token.type}-${index}`;

    switch (token.type) {
      case "text": {
        const textToken = token as Tokens.Text;
        return (
          <box key={key}>
            <text>
              {textToken.tokens
                ? renderInline(textToken.tokens)
                : textToken.text}
            </text>
          </box>
        );
      }

      case "heading": {
        const headingToken = token as Tokens.Heading;
        const level = headingToken.depth as 1 | 2 | 3 | 4 | 5 | 6;
        const style = theme[`h${level}`];

        // Add padding bottom for visual separation
        return (
          <box key={key} paddingTop={1} paddingBottom={1}>
            <text>
              <span
                fg={style.fg}
                bold={style.bold as any}
                underline={style.underline as any}
              >
                {renderInline(headingToken.tokens)}
              </span>
            </text>
          </box>
        );
      }

      case "paragraph":
        return (
          <box key={key} marginBottom={1}>
            <text>{renderInline((token as Tokens.Paragraph).tokens)}</text>
          </box>
        );

      case "code": {
        const codeToken = token as Tokens.Code;
        return (
          <box
            key={key}
            marginBottom={1}
            border
            borderStyle="single"
            borderColor={theme.codeBlock.borderColor}
          >
            {/* Using the OpenTUI Code Component */}
            <code
              content={codeToken.text}
              syntaxStyle={SyntaxStyle.fromTheme([])}
              filetype={codeToken.lang?.toLowerCase() || "typescript"}
            />
          </box>
        );
      }

      case "blockquote":
        return (
          <box key={key} flexDirection="row" alignItems="center">
            <box
              backgroundColor={theme.blockquote.borderLeftColor}
              width={2}
              height="100%"
            ></box>
            <box marginBottom={1} paddingLeft={2}>
              <text>
                <span fg={theme.blockquote.fg}>
                  {renderInline((token as Tokens.Blockquote).tokens)}
                </span>
              </text>
            </box>
          </box>
        );

      case "list": {
        const listToken = token as Tokens.List;
        return (
          <box key={key} flexDirection="column" marginBottom={1}>
            {listToken.items.map((item, i) => (
              <box key={i} flexDirection="row">
                <text>
                  <span fg="gray">
                    {listToken.ordered ? `${i + 1}. ` : "• "}
                  </span>
                </text>
                <box flexDirection="column">
                  {/* Recursively handle block content inside list items */}
                  {item.tokens.map((t, j) => renderBlock(t, j))}
                </box>
              </box>
            ))}
          </box>
        );
      }

      case "space":
        return <box key={key} height={1} />;

      case "hr":
        return (
          <box key={key} height={1} marginBottom={1}>
            <text>{"─".repeat(process.stdout.columns || 50)}</text>
          </box>
        );

      default:
        return null;
    }
  };

  // Helper to render <details> blocks as thinking content (rendered as blockquotes)
  const renderDetailsBlock = (block: DetailsBlock, index: number) => {
    const detailsStyle = theme.details;

    // Parse the content to get tokens
    let tokens: Token[];
    try {
      tokens = marked.lexer(block.content);
    } catch (e) {
      tokens = [];
    }

    return (
      <box key={`details-${index}`} flexDirection="column" marginBottom={1}>
        {/* Summary line with blockquote styling */}
        <box
          key={`details-summary-${index}`}
          flexDirection="row"
          alignItems="center"
        >
          <box
            backgroundColor={theme.blockquote.borderLeftColor}
            width={2}
            height="100%"
          ></box>
          <box marginBottom={1} paddingLeft={2}>
            <text>
              <span fg={detailsStyle.fg}>{block.summary}</span>
            </text>
          </box>
        </box>
        {/* Content with blockquote styling */}
        {tokens.map((token, tokenIndex) => {
          if (token.type === "paragraph") {
            return (
              <box
                key={`details-content-${tokenIndex}`}
                flexDirection="row"
                alignItems="center"
              >
                <box
                  backgroundColor={theme.blockquote.borderLeftColor}
                  width={2}
                  height="100%"
                ></box>
                <box marginBottom={1} paddingLeft={2}>
                  <text>
                    <span fg={detailsStyle.fg}>
                      {renderInline((token as Tokens.Paragraph).tokens)}
                    </span>
                  </text>
                </box>
              </box>
            );
          }
          return renderBlock(token, tokenIndex);
        })}
      </box>
    );
  };

  return (
    <box flexDirection="column">
      {/* Render details blocks first (thinking content typically appears at the top) */}
      {detailsBlocks
        .sort((a, b) => a.position - b.position)
        .map((block, index) => renderDetailsBlock(block, index))}
      {tokens.map((token, index) => renderBlock(token, index))}
    </box>
  );
};

export default Markdown;
