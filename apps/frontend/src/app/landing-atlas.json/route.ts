import { demoAtlas } from "@/components/landing/stats";

/** The landing's sample atlas as a static JSON file (prerendered at build), see landing/atlas.ts. */
export async function GET() {
  return Response.json(await demoAtlas());
}
