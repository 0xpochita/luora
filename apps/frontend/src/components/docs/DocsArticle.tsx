import Link from "next/link";
import type { ReactNode } from "react";
import {
  anchorOf,
  type Block,
  type DocPage,
  hrefOf,
  PAGES,
} from "@/features/docs/pages";
import { CodeBlock } from "./CodeBlock";
import { DocsVideo } from "./DocsVideo";

/** `code`, **bold** and [label](href) inside a line of docs text */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    const key = `${i}:${part.slice(0, 12)}`;
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code
          key={key}
          className="rounded-[5px] bg-white/[.06] px-1.5 py-px font-mono text-[0.88em] text-fg"
        >
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={key} className="font-medium text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const cls =
        "text-fg underline decoration-white/25 underline-offset-[3px] transition-colors hover:decoration-white/70";
      return link[2].startsWith("/") ? (
        <Link key={key} href={link[2]} className={cls}>
          {link[1]}
        </Link>
      ) : (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
        >
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

function BlockView({ b }: { b: Block }): ReactNode {
  if ("p" in b)
    return (
      <p className="text-[15px] text-body leading-[1.75]">
        <Inline text={b.p} />
      </p>
    );
  if ("h2" in b)
    return (
      <h2
        id={anchorOf(b.h2)}
        className="scroll-mt-24 pt-6 font-medium text-[21px] text-fg tracking-[-0.01em]"
      >
        {b.h2}
      </h2>
    );
  if ("h3" in b)
    return (
      <h3
        id={anchorOf(b.h3)}
        className="scroll-mt-24 pt-2 font-medium text-[16px] text-fg"
      >
        {b.h3}
      </h3>
    );
  if ("list" in b)
    return (
      <ul className="flex flex-col gap-2 text-[15px] text-body leading-[1.7]">
        {b.list.map((t) => (
          <li key={t} className="flex gap-3">
            <span className="mt-[0.7em] size-1 flex-none rounded-full bg-white/35" />
            <span>
              <Inline text={t} />
            </span>
          </li>
        ))}
      </ul>
    );
  if ("steps" in b)
    return (
      <ol className="flex flex-col gap-2.5 text-[15px] text-body leading-[1.7]">
        {b.steps.map((t, i) => (
          <li key={t} className="flex gap-3">
            <span className="mt-[2px] grid size-6 flex-none place-items-center rounded-chip bg-raised font-mono text-[12px] text-muted">
              {i + 1}
            </span>
            <span>
              <Inline text={t} />
            </span>
          </li>
        ))}
      </ol>
    );
  if ("code" in b) return <CodeBlock text={b.code} />;
  if ("video" in b) return <DocsVideo src={b.video} caption={b.caption} />;
  if ("note" in b)
    return (
      <p className="flex gap-3 rounded-inner border border-border bg-inner-grad p-4 text-[14px] text-body leading-[1.65]">
        <span
          className={`mt-[0.55em] size-1.5 flex-none rounded-full ${b.tone === "warn" ? "bg-yellow" : "bg-white/60"}`}
        />
        <span>
          <Inline text={b.note} />
        </span>
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-inner border border-border">
      <table className="w-full border-collapse text-left text-[14px]">
        <thead>
          <tr className="bg-white/[.03]">
            {b.table.head.map((h) => (
              <th
                key={h}
                className="border-border border-b px-4 py-2.5 font-medium text-[13px] text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.table.rows.map((row) => (
            <tr
              key={row.join("|")}
              className="border-border border-b last:border-0"
            >
              {row.map((c, i) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed columns
                  key={i}
                  className={`px-4 py-2.5 align-top leading-[1.6] ${i === 0 ? "whitespace-nowrap font-mono text-[13px] text-fg" : "text-body"}`}
                >
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One docs page: the title, its one-line lead in grey, the blocks, then Previous / Next as two
 * cards (D1 onorca.dev/docs: a mono uppercase label over the page's title).
 */
export function DocsArticle({ page }: { page: DocPage }) {
  const i = PAGES.indexOf(page);
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  return (
    <article className="min-w-0 max-w-[720px] pb-16">
      <h1 className="font-medium text-[clamp(28px,3vw,36px)] text-fg leading-tight tracking-[-0.02em]">
        {page.title}
      </h1>
      <p className="mt-2 text-[17px] text-dim leading-relaxed">{page.lead}</p>
      <div className="mt-8 flex flex-col gap-5">
        {page.blocks.map((b, k) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a page's blocks never reorder
          <BlockView key={k} b={b} />
        ))}
      </div>
      <nav
        aria-label="Previous and next page"
        className="mt-14 grid gap-3 border-border border-t pt-8 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={hrefOf(prev)}
            className="rounded-inner border border-border px-4 py-3.5 transition-colors hover:border-border-strong"
          >
            <span className="font-mono text-[11px] text-dim uppercase tracking-[0.08em]">
              ← Previous
            </span>
            <span className="mt-1 block text-[14.5px] text-fg">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={hrefOf(next)}
            className="rounded-inner border border-border px-4 py-3.5 text-right transition-colors hover:border-border-strong"
          >
            <span className="font-mono text-[11px] text-dim uppercase tracking-[0.08em]">
              Next →
            </span>
            <span className="mt-1 block text-[14.5px] text-fg">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </article>
  );
}
