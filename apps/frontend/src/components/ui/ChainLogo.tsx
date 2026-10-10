/**
 * A chain's own mark (DefiLlama's chain icons; Ethereum's diamond from simple-icons, CC0), for the
 * Fork picker. Unknown families get a neutral dot.
 */
const FILE: Record<string, string> = {
  ethereum: "ethereum.svg",
  arbitrum: "arbitrum.webp",
  base: "base.webp",
  robinhood: "robinhood.webp",
  hyperliquid: "hyperliquid.webp",
  tempo: "tempo.webp",
};

export function ChainLogo({
  family,
  className = "size-4",
}: {
  family: string;
  className?: string;
}) {
  const file = FILE[family];
  if (!file)
    return (
      <span
        aria-hidden="true"
        className={`block flex-none rounded-full bg-muted ${className}`}
      />
    );
  return (
    // a 16px local icon: next/image would add nothing here
    // biome-ignore lint/performance/noImgElement: tiny static asset
    <img
      src={`/logos/chains/${file}`}
      alt=""
      aria-hidden="true"
      className={`block flex-none rounded-[4px] object-cover ${className}`}
    />
  );
}
