/** Status tones → dot colour. red = finding / revert / bad, green = pass, yellow = warning, blue = external. */
export const TONE_DOT = {
  neutral: "bg-dim",
  ok: "bg-green",
  bad: "bg-red",
  warn: "bg-yellow",
  info: "bg-blue",
  solid: "bg-primary-fg",
} as const;

export type Tone = keyof typeof TONE_DOT;
