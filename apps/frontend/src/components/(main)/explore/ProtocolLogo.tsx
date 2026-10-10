import Image from "next/image";

/** The protocol's real logo when the app ships one (public/logos), else its initial on a graphite tile. */
export function ProtocolLogo({
  name,
  logo,
  size = 36,
}: {
  name: string;
  logo?: string;
  size?: number;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className="grid flex-none place-items-center rounded-tile border border-border bg-raised"
    >
      {logo ? (
        <Image
          src={logo}
          alt=""
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
        />
      ) : (
        <span className="font-medium text-[14px] text-text">{name[0]}</span>
      )}
    </span>
  );
}
