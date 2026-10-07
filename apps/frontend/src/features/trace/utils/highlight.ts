/** Tiny Solidity tokenizer → typed segments (rendered as React spans, no innerHTML). */
export type TokenType =
  | "comment"
  | "string"
  | "keyword"
  | "type"
  | "number"
  | "plain";
export type Token = { type: TokenType; text: string };

const KEYWORDS =
  "pragma|solidity|contract|interface|library|function|modifier|event|emit|returns|return|require|revert|if|else|for|while|external|internal|public|private|view|pure|payable|constructor|mapping|import|is|memory|calldata|storage|constant|immutable|override|virtual|new|assembly";
const TYPES =
  "address|uint256|uint128|uint112|uint8|int256|bool|string|bytes|bytes32|I[A-Z]\\w*";
const RE = new RegExp(
  `(\\/\\/.*$)|("[^"]*")|\\b(${KEYWORDS})\\b|\\b(${TYPES})\\b|\\b(\\d[\\d_]*(?:e\\d+)?)\\b`,
  "g",
);

export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  for (const m of line.matchAll(RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "plain", text: line.slice(last, i) });
    const type: TokenType = m[1]
      ? "comment"
      : m[2]
        ? "string"
        : m[3]
          ? "keyword"
          : m[4]
            ? "type"
            : "number";
    out.push({ type, text: m[0] });
    last = i + m[0].length;
  }
  if (last < line.length) out.push({ type: "plain", text: line.slice(last) });
  return out;
}
