import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site";

/** Every page may be crawled; the API routes (the local Claude bridge, Start test) are not pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
