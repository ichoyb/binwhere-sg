'use client';

interface LogoIconProps {
  size?: number;
  className?: string;
}

export default function LogoIcon({ size = 32, className }: LogoIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icons/binwhere-logo.png"
      alt="BinWhere logo"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
