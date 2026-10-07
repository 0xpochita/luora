import type { Piece } from "../types";

/** A known on-chain integration, recognised from the names in a call / dependency piece. */
export type Protocol = {
  id: string;
  name: string;
  match: RegExp;
  logo: string;
};

// Order = priority: protocols before plain tokens (a Uniswap swap description may mention USDC).
export const PROTOCOLS: Protocol[] = [
  {
    id: "uniswap",
    name: "Uniswap",
    match:
      /\bIUniswap\w*|\bISwapRouter\w*|\bswapExact\w*|\bexact(In|Out)put\w*|\bIQuoter\w*|\bUniswap\b/,
    logo: "/logos/uniswap.png",
  },
  {
    id: "aave",
    name: "Aave",
    match:
      /\bI(Lending)?Pool(AddressesProvider)?\b|\bIAToken\b|\bAave\b|\.(supply|flashLoan|flashLoanSimple)\b/,
    logo: "/logos/aave.png",
  },
  {
    id: "chainlink",
    name: "Chainlink",
    match: /\bAggregatorV[23]\w*Interface\b|\blatestRoundData\b|\bChainlink\b/,
    logo: "/logos/chainlink.png",
  },
  {
    id: "curve",
    name: "Curve",
    match: /\bICurve\w*|\bget_dy(_underlying)?\b|\bexchange_underlying\b/,
    logo: "/logos/curve.png",
  },
  {
    id: "compound",
    name: "Compound",
    match: /\bI?CToken\b|\bI?Comet\b|\bI?Comptroller\b|\bCompound\b/,
    logo: "/logos/compound.png",
  },
  {
    id: "lido",
    name: "Lido",
    match: /\bILido\b|\bI?W?stETH\b|\bLido\b/i,
    logo: "/logos/lido.png",
  },
  { id: "usdc", name: "USDC", match: /\bI?USDC\b/i, logo: "/logos/usdc.png" },
  { id: "usdt", name: "USDT", match: /\bI?USDT\b/i, logo: "/logos/usdt.png" },
  { id: "weth", name: "WETH", match: /\bI?WETH9?\b/i, logo: "/logos/weth.png" },
  { id: "dai", name: "DAI", match: /\bI?DAI\b/i, logo: "/logos/dai.png" },
];

/** Which known protocol an external piece (deps / calls) talks to, from its names and description. */
export function protocolOf(
  p: Pick<Piece, "sys" | "name" | "target" | "member" | "desc">,
): Protocol | null {
  if (p.sys !== "deps" && p.sys !== "calls") return null;
  const call = p.target && p.member ? `${p.target}.${p.member}` : "";
  const text = [p.name, call, p.target, p.member, p.desc].join(" ");
  return PROTOCOLS.find((x) => x.match.test(text)) ?? null;
}
