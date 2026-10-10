// The testnets Luora can fork: `node luora-export.mjs --chain base-sepolia` runs the tests on a
// copy of that chain's state at its latest block (nothing is sent, no key, no gas), and
// `--forks all` adds one such run per chain next to the local one. Public RPCs; for a provider
// endpoint set LUORA_RPC_<KEY>, e.g. LUORA_RPC_BASE_SEPOLIA=https://… (public ones rate-limit).

export const CHAINS = {
  'sepolia': { name: 'Ethereum Sepolia', family: 'ethereum', id: 11155111, rpc: 'https://ethereum-sepolia-rpc.publicnode.com' },
  'arbitrum-sepolia': { name: 'Arbitrum Sepolia', family: 'arbitrum', id: 421614, rpc: 'https://sepolia-rollup.arbitrum.io/rpc' },
  'base-sepolia': { name: 'Base Sepolia', family: 'base', id: 84532, rpc: 'https://sepolia.base.org' },
  'robinhood-testnet': { name: 'Robinhood Chain Testnet', family: 'robinhood', id: 46630, rpc: 'https://rpc.testnet.chain.robinhood.com' },
  'hyperevm-testnet': { name: 'HyperEVM Testnet', family: 'hyperliquid', id: 998, rpc: 'https://rpc.hyperliquid-testnet.xyz/evm' },
  'tempo-testnet': { name: 'Tempo Testnet (Moderato)', family: 'tempo', id: 42431, rpc: 'https://rpc.moderato.tempo.xyz' },
};

/** A chain by key, its RPC overridable from the environment. Throws with the list of keys. */
export function resolveChain(key, env = process.env) {
  const c = CHAINS[key];
  if (!c) throw new Error(`unknown chain "${key}"; one of ${Object.keys(CHAINS).join(', ')}`);
  const override = env[`LUORA_RPC_${key.toUpperCase().replace(/-/g, '_')}`];
  return { key, ...c, rpc: override || c.rpc };
}

/** `--forks all` or `--forks a,b` → chain keys (unknown keys throw). */
export const forkKeys = list => (list === 'all' ? Object.keys(CHAINS) : list.split(',').map(k => resolveChain(k.trim()).key));

/** The chain's latest block, after checking the RPC really serves that chain. */
export async function latestBlock(chain, fetchFn = fetch) {
  const call = async method => {
    const res = await fetchFn(chain.rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
      signal: AbortSignal.timeout(20_000),
    });
    const j = await res.json();
    if (j.error || !j.result) throw new Error(`${chain.name} RPC: ${j.error?.message ?? res.status}`);
    return Number(BigInt(j.result));
  };
  const id = await call('eth_chainId');
  if (id !== chain.id) throw new Error(`${chain.rpc} serves chain ${id}, not ${chain.name} (${chain.id})`);
  return call('eth_blockNumber');
}
