"use client";

import { IconButton, Toolbar } from "@/components/ui";

export function ZoomControls({
  onIn,
  onOut,
  onFit,
  onReset,
}: {
  onIn: () => void;
  onOut: () => void;
  onFit: () => void;
  /** restore the auto layout after nodes were dragged */
  onReset?: () => void;
}) {
  return (
    <div data-no-pan className="absolute top-1/2 right-3 -translate-y-1/2">
      <Toolbar vertical>
        <IconButton label="Zoom in" size="sm" onClick={onIn}>
          +
        </IconButton>
        <IconButton label="Zoom out" size="sm" onClick={onOut}>
          −
        </IconButton>
        <IconButton label="Fit" size="sm" onClick={onFit}>
          ⤢
        </IconButton>
        {onReset && (
          <IconButton label="Reset layout" size="sm" onClick={onReset}>
            ↺
          </IconButton>
        )}
      </Toolbar>
    </div>
  );
}
