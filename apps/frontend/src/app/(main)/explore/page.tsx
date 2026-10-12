import { ExploreGallery } from "@/components/(main)";
import { protocolSummaries } from "@/features/explore/services/protocols";

export const metadata = {
  title: "Explore",
  description:
    "Known DeFi protocols mapped for auditors: their contracts, how they connect, their main flows as sequence diagrams, and what to check in each.",
  alternates: { canonical: "/explore" },
};

export default function ExplorePage() {
  return <ExploreGallery items={protocolSummaries()} />;
}
