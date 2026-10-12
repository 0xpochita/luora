/**
 * Where Luora lives publicly. Canonical links, the sitemap, robots.txt and the social cards point
 * here; NEXT_PUBLIC_URL (set on the deploy) wins, a local build falls back to the public domain so
 * its pages never claim localhost as canonical.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_URL || "https://www.luorasec.xyz"
).replace(/\/+$/, "");

export const SITE_NAME = "Luora";
export const SITE_TITLE = "Luora · See what your smart contract actually does";
export const SITE_DESCRIPTION =
  "Luora is a defensive tool for smart contract auditors and bug bounty hunters: decoded Foundry traces, your contract as a graph, scenario tests exported as .t.sol, and Slither and Aderyn findings merged in one place.";
export const X_HANDLE = "@luorasec";
