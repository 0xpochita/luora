/** Brand mark: soft white rounded tile, dark "L", dark dot. */
export function LogoMark() {
  return (
    <span className="relative grid size-9 place-items-center rounded-tile bg-primary font-medium text-[17px] text-primary-fg shadow-soft">
      L
      <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary-fg/70" />
    </span>
  );
}
