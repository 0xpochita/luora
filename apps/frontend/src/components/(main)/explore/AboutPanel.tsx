"use client";

import type { ReactNode } from "react";
import { PH, PhIcon } from "@/components/ui";
import type { Piece } from "@/features/atlas";
import {
  EDGE_VERB,
  githubUrl,
  type Protocol,
  type ProtocolContract,
} from "@/features/explore";

/*
 * What the selection is (L2BEAT project page: numbered facts, "Can interact with X: what",
 * every contract linked to its source; P5 pin/669206825922691039: the documentation panel next
 * to the diagram). Nothing selected: the protocol, its pinned code and what to check.
 */

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="mt-4">
    <h3 className="px-1 text-[12.5px] text-dim">{title}</h3>
    <div className="mt-1.5">{children}</div>
  </section>
);

const Ext = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-fg"
  >
    <PhIcon d={PH.code} className="size-[13px]" />
    {children}
  </a>
);

export function AboutPanel({
  protocol: p,
  contract,
  piece,
  onContract,
}: {
  protocol: Protocol;
  contract: ProtocolContract | null;
  /** the piece selected in the Lab, when the Contract view is open */
  piece: (Piece & { file?: string; repo?: string | null }) | null;
  onContract: (name: string) => void;
}) {
  if (!contract)
    return (
      <div className="px-4 pb-4">
        <p className="text-[13px] text-body leading-relaxed">{p.about}</p>
        <Section title="Code, pinned">
          <ul className="space-y-2.5 px-1">
            {p.repos.map((r) => (
              <li
                key={r.id}
                className="text-[12.5px] text-muted leading-normal"
              >
                <Ext href={`${r.url}/tree/${r.commit}`}>
                  {r.url.replace("https://github.com/", "")} @ {r.tag}
                </Ext>
                <span className="block font-mono text-dim">
                  {r.commit.slice(0, 10)} · {r.license}
                </span>
                {r.licenseNote && (
                  <span className="block text-dim">{r.licenseNote}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="What an auditor checks">
          <ul className="space-y-1.5 px-1">
            {p.checks.map((c) => (
              <li
                key={c}
                className="flex gap-2.5 text-[13px] text-body leading-normal"
              >
                <span className="mt-[7px] size-1.5 flex-none rounded-full bg-yellow" />
                {c}
              </li>
            ))}
          </ul>
        </Section>
        <p className="mt-4 px-1 text-[12.5px] text-dim leading-normal">
          {p.notes} Mapped with {p.generatedWith}.
        </p>
      </div>
    );

  const c = contract;
  const url = githubUrl(p, c.repo, c.file, c.line);
  const out = p.edges.filter((e) => e.from === c.name && e.kind !== "inherits");
  const into = p.edges.filter((e) => e.to === c.name && e.kind !== "inherits");
  const pieceUrl = piece
    ? githubUrl(
        p,
        piece.file ? piece.repo : c.repo,
        piece.file ?? c.file,
        piece.line,
      )
    : null;
  const rel = (
    who: string,
    before: string,
    after: string,
    members: string[],
    key: string,
  ) => (
    <li key={key} className="text-[13px] leading-normal">
      {before && <span className="text-body">{before} </span>}
      <button
        type="button"
        onClick={() => onContract(who)}
        className="text-fg underline decoration-white/25 underline-offset-2 hover:decoration-white"
      >
        {who}
      </button>
      {after && <span className="text-body"> {after}</span>}
      {members.length > 0 && (
        <span
          className="block truncate font-mono text-[11.5px] text-dim"
          title={members.join(", ")}
        >
          {members.join(", ")}
        </span>
      )}
    </li>
  );

  return (
    <div className="px-4 pb-4">
      <p className="text-[12.5px] text-muted">
        {c.kind === "library"
          ? "Library"
          : c.kind === "abstract"
            ? "Abstract contract"
            : "Contract"}{" "}
        · {c.license ?? "no licence header"} ·{" "}
        {c.excerpts ? "source kept" : "structure only"}
      </p>
      <p className="mt-1 text-[14px] text-fg">{c.role}</p>
      <p className="mt-1.5 text-[13px] text-body leading-relaxed">
        {c.summary}
      </p>
      {url && (
        <p className="mt-2">
          <Ext href={url}>
            {c.file}:{c.line + 1}
          </Ext>
        </p>
      )}
      <p className="mt-2 text-[12.5px] text-muted">
        <span className="font-mono text-fg">{c.counts.entry}</span> entry points
        · <span className="font-mono text-fg">{c.counts.storage}</span> storage
        slots · <span className="font-mono text-fg">{c.counts.events}</span>{" "}
        events
      </p>

      {piece && (
        <Section title="Selected in the Lab">
          <div className="rounded-inner border border-border bg-inner-grad px-3 py-2.5">
            <p className="font-mono text-[12.5px] text-fg">{piece.name}</p>
            <p className="mt-1 text-[13px] text-body leading-normal">
              {piece.desc}
            </p>
            {pieceUrl && (
              <p className="mt-1.5">
                <Ext href={pieceUrl}>
                  {(piece.file ?? c.file).split("/").pop()}:
                  {(piece.line ?? 0) + 1}
                </Ext>
              </p>
            )}
          </div>
        </Section>
      )}

      {c.gated.length > 0 && (
        <Section title="Who may call what">
          <ul className="space-y-1 px-1">
            {c.gated.map((g, i) => (
              <li key={`${g.fn}-${i}`} className="flex gap-2 text-[13px]">
                <span className="min-w-0 truncate font-mono text-body">
                  {g.fn}
                </span>
                <span className="ml-auto flex-none text-muted">
                  {g.by ?? g.caller}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {c.bases.length > 0 && (
        <Section title="Inherits">
          <p className="px-1 text-[12.5px] text-muted leading-normal">
            {c.bases.join(", ")}
          </p>
        </Section>
      )}
      {out.length > 0 && (
        <Section title="Reaches out to">
          <ul className="space-y-1.5 px-1">
            {out.map((e) =>
              rel(e.to, EDGE_VERB[e.kind], "", e.members, `${e.to}|${e.kind}`),
            )}
          </ul>
        </Section>
      )}
      {into.length > 0 && (
        <Section title="Reached from">
          <ul className="space-y-1.5 px-1">
            {into.map((e) =>
              rel(
                e.from,
                "",
                `${EDGE_VERB[e.kind]} it`,
                e.members,
                `${e.from}|${e.kind}`,
              ),
            )}
          </ul>
        </Section>
      )}
    </div>
  );
}
