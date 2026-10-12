import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";
import { cases } from "@/features/exploits";
import { protocolIds } from "@/features/explore/services/protocols";

/** The landing, the four sections, and every protocol map and incident post-mortem. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({
    url: `${SITE_URL}${path}`,
    priority,
  });
  return [
    page("", 1),
    page("/trace", 0.8),
    page("/atlas", 0.8),
    page("/explore", 0.7),
    page("/exploits", 0.7),
    ...protocolIds().map((id) => page(`/explore/${id}`, 0.6)),
    ...cases().map((c) => page(`/exploits/${c.id}`, 0.6)),
  ];
}
