"use client";

export function ZoomControls({
  onIn,
  onOut,
  onFit,
}: {
  onIn: () => void;
  onOut: () => void;
  onFit: () => void;
}) {
  const btn = "h-[30px] w-8 rounded-full hover:bg-soft";
  return (
    <div
      data-no-pan
      className="absolute right-3.5 bottom-3.5 flex gap-0.5 rounded-full bg-card p-1 shadow-sh2"
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
    </div>
  );
}
