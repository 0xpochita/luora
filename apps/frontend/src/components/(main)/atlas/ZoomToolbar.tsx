import { IconButton, Toolbar } from "@/components/ui";

/** Vertical zoom toolbar on the right edge of a pan/zoom canvas (Map, Flow). */
export function ZoomToolbar({
  onIn,
  onOut,
  onFit,
}: {
  onIn: () => void;
  onOut: () => void;
  onFit: () => void;
}) {
  return (
    <div
      data-no-pan
      className="absolute top-1/2 right-3 -translate-y-1/2 cursor-default"
    >
      <Toolbar vertical>
        <IconButton label="Zoom in" size="sm" onClick={onIn}>
          +
        </IconButton>
        <IconButton label="Zoom out" size="sm" onClick={onOut}>
          −
        </IconButton>
        <IconButton label="Fit to view" size="sm" onClick={onFit}>
          ⤢
        </IconButton>
      </Toolbar>
    </div>
  );
}
