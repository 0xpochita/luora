/** Status tones → dot colour. red = findings / reverts / bad, green = pass. */
export const TONE_DOT = {
  neutral: "bg-dim",
  ok: "bg-green",
  bad: "bg-red",
  warn: "bg-yellow",
  info: "bg-blue",
  violet: "bg-violet",
  solid: "bg-primary-fg",
} as const;

export type Tone = keyof typeof TONE_DOT;
