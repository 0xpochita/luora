/**
 * The local bridge (foundry/luora-bridge.mjs): the hosted Luora's way to run forge on the
 * auditor's machine. The bridge prints https://www.luorasec.xyz/trace#bridge=<port>.<token>; the
 * #fragment never reaches a server, the tab keeps it (sessionStorage) and strips it from the
 * address bar, and every request carries the token. Pure parts here; RunProvider connects.
 */

export type BridgeLink = { url: string; token: string };
export type Bridge = BridgeLink & { project: string };

/** `#bridge=7457.<token>` (or the stored `7457.<token>`) → the bridge's address and token */
export function bridgeFrom(s: string | null | undefined): BridgeLink | null {
  const m = /(?:^|bridge=)(\d{4,5})\.([\w-]{16,128})(?:&|$)/.exec(s ?? "");
  if (!m) return null;
  const port = Number(m[1]);
  if (port < 1024 || port > 65535) return null;
  return { url: `http://127.0.0.1:${port}`, token: m[2] };
}

/** a request to the bridge, with its token */
export const bridgeFetch = (
  b: BridgeLink,
  path: string,
  init: RequestInit = {},
) =>
  fetch(`${b.url}${path}`, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${b.token}` },
    cache: "no-store",
  });

/** a fetch that never got an answer: the bridge is off, or the browser kept the page from it */
export const BRIDGE_UNREACHABLE =
  "Can't reach the bridge on this computer. Is node luora-bridge.mjs still running in your Foundry project? If the browser asked to let this site reach your computer or local network, allow it, then retry.";
