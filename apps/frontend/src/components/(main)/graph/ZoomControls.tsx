"use client";

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
  const btn = "h-7 w-8 font-mono text-muted hover:bg-soft hover:text-ink";
  return (
    <div
      data-no-pan
      className="absolute right-3 bottom-3 flex divide-x divide-line border border-edge bg-shell"
    >
      <button
        type="button"
        aria-label="Zoom out"
        className={btn}
        onClick={onOut}
      >
        −
      </button>
      <button type="button" aria-label="Fit" className={btn} onClick={onFit}>
        ⤢
      </button>
      <button type="button" aria-label="Zoom in" className={btn} onClick={onIn}>
        +
      </button>
      {onReset && (
        <button
          type="button"
          aria-label="Reset layout"
          title="Reset layout"
          className={btn}
          onClick={onReset}
        >
          ↺
        </button>
      )}
    </div>
  );
}
