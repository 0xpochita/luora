/** Brand mark: white rounded tile, dark "L", violet dot. */
export function LogoMark() {
  return (
    <span className="relative grid size-9 place-items-center rounded-tile bg-primary font-semibold text-[17px] text-primary-fg shadow-soft">
      L
      <span className="absolute top-2 right-2 size-1.5 rounded-full bg-violet" />
    </span>
  );
}
