import type { ReactNode } from "react";
import { IconButton, Toolbar } from "@/components/ui";

/**
 * The one zoom dock of every Atlas canvas (Overview, Graph, Paths, Scenarios): horizontal, in the
 * bottom-right corner, zoom out · zoom in · Fit (docs/ux/atlas.md D3; A2 pin/23925441769073772's
 * single canvas toolbar, always in the same place).
 */
export function ZoomToolbar({
  onIn,
  onOut,
  onFit,
  children,
}: {
  onIn: () => void;
  onOut: () => void;
  onFit: () => void;
  /** an action that only matters now (Graph: Reset layout once a card was dragged) */
  children?: ReactNode;
}) {
  const stop = (f: () => void) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    f();
  };
  return (
    <div data-no-pan className="absolute right-3 bottom-3 z-[4] cursor-default">
      <Toolbar>
        <IconButton label="Zoom out" size="sm" onClick={stop(onOut)}>
          −
        </IconButton>
        <IconButton label="Zoom in" size="sm" onClick={stop(onIn)}>
          +
        </IconButton>
        <IconButton
          label="Fit to view"
          size="sm"
          className="px-2 text-[11.5px]"
          onClick={stop(onFit)}
        >
          Fit
        </IconButton>
        {children}
      </Toolbar>
    </div>
  );
}
