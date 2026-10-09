import {
  Ask,
  Compare,
  Faq,
  Features,
  Finale,
  Findings,
  Hero,
  Product,
  Run,
  SmoothScroll,
  Tests,
  Words,
} from "@/components/landing";
import { sampleRun } from "@/components/landing/stats";
import "@/components/landing/landing.css";

export const metadata = {
  title: { absolute: "Luora · See what your contract actually does" },
  description:
    "Defensive tooling for smart contract auditors: decoded Foundry traces, a contract graph that exports Foundry tests, deduplicated Slither and Aderyn findings, and forge coverage.",
};

/** One continuous story, every section handing over to the next (see the Genie map in index.ts). */
export default async function Home() {
  const { log } = await sampleRun();
  return (
    <main className="relative min-h-full overflow-x-clip">
      <SmoothScroll>
        <Hero log={log} />
        <Product />
        <Run />
        <Words />
        <Features />
        <Findings />
        <Tests />
        <Ask />
        <Compare />
        <Faq />
        <Finale />
      </SmoothScroll>
    </main>
  );
}
