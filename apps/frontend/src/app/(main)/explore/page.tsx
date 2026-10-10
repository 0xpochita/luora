import { ExploreGallery } from "@/components/(main)";
import { protocolSummaries } from "@/features/explore/services/protocols";

export const metadata = { title: "Explore" };

export default function ExplorePage() {
  return <ExploreGallery items={protocolSummaries()} />;
}
