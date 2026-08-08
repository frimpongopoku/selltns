import { useId } from "react";

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#14C088" />
          <stop offset="1" stopColor="#0B7A56" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill={`url(#${gradientId})`} />
      <text
        x="16"
        y="22.5"
        textAnchor="middle"
        fontFamily="var(--font-manrope), sans-serif"
        fontWeight={800}
        fontSize="19"
        fill="white"
        letterSpacing="-0.5"
      >
        S
      </text>
    </svg>
  );
}
