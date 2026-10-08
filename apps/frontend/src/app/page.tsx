import {
  Bento,
  Compare,
  Faq,
  Features,
  FinalCta,
  Footer,
  Hero,
  Pillars,
  Proof,
  Statement,
  WorksWith,
} from "@/components/landing";
import { sampleRun } from "@/components/landing/stats";
import "@/components/landing/landing.css";

export const metadata = {
  title: { absolute: "Luora · See what your contract actually does" },
  description:
    "Defensive tooling for smart contract auditors: decoded Foundry traces, a contract graph that exports Foundry tests, deduplicated Slither and Aderyn findings, and forge coverage.",
};

export default async function Home() {
  const { log } = await sampleRun();
  return (
    <main className="min-h-full overflow-x-clip bg-black">
      <Hero log={log} />
      <WorksWith />
      <Features />
      <Bento />
      <Pillars />
      <Proof />
      <Compare />
      <Statement />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
