import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProtocolSkeleton, ProtocolWorkspace } from "@/components/(main)";
import {
  loadProtocol,
  protocolIds,
} from "@/features/explore/services/protocols";

export const generateStaticParams = () =>
  protocolIds().map((protocol) => ({ protocol }));

export async function generateMetadata({
  params,
}: PageProps<"/explore/[protocol]">) {
  const p = loadProtocol((await params).protocol);
  if (!p) return { title: "Explore" };
  return {
    title: `${p.name} ${p.version}`,
    description: p.purpose,
    alternates: { canonical: `/explore/${p.id}` },
  };
}

async function Content({ params }: PageProps<"/explore/[protocol]">) {
  const p = loadProtocol((await params).protocol);
  if (!p) notFound();
  return <ProtocolWorkspace protocol={p} />;
}

export default function ProtocolPage(props: PageProps<"/explore/[protocol]">) {
  return (
    <Suspense fallback={<ProtocolSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
