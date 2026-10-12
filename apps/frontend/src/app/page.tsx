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
import "@/components/landing/landing.css";
import { GITHUB } from "@/components/landing/Hero";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/config/site";

export const metadata = {
  title: { absolute: SITE_TITLE },
  description:
    "Defensive tooling for smart contract auditors: decoded Foundry traces, a contract graph that exports Foundry tests, deduplicated Slither and Aderyn findings, and forge coverage.",
  alternates: { canonical: "/" },
};

/**
 * What search engines read about Luora besides the page: the project (also known by its handle,
 * luorasec, with its X and GitHub), the site, and the app itself, free and open source.
 */
const ORG = `${SITE_URL}/#org`;
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORG,
      name: SITE_NAME,
      alternateName: "luorasec",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/tile-180.png`,
      sameAs: ["https://x.com/luorasec", GITHUB],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: "luorasec",
      url: SITE_URL,
      publisher: { "@id": ORG },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": ORG },
    },
  ],
};

/** One continuous story, every section handing over to the next (see the Genie map in index.ts). */
export default async function Home() {
  return (
    <main className="relative min-h-full overflow-x-clip">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD of our own, `<` escaped
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <SmoothScroll>
        <Hero />
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
