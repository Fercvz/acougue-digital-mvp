import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
function outline({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };
}
export function ChickenIcon(props: IconProps) {
  return (
    <svg {...outline(props)}>
      <path d="M6 10 3 7v6c0 4 3 6 7 6s7-3 7-7V7a3 3 0 0 0-6 0v4" />
      <path d="m17 8 4 2-4 1M12 4V2l2 1 2-1v3M8 19v3m5-3v3M8 12c0 3 4 3 5 0" />
      <circle cx="14.5" cy="7.5" r=".7" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function PigIcon(props: IconProps) {
  return (
    <svg {...outline(props)}>
      <path d="M6 6 3 3v7a9 9 0 1 0 18 0V3l-3 3a11 11 0 0 0-12 0Z" />
      <rect x="7" y="12" width="10" height="7" rx="3.5" />
      <path d="M10 15v1m4-1v1" />
      <circle cx="7.5" cy="10" r=".8" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="10" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function SausageIcon(props: IconProps) {
  return (
    <svg {...outline(props)}>
      <path d="M6 7c4-2 7 0 8 4 1 3 2 4 4 5a3 3 0 0 1-2 6c-5-2-7-5-8-9-1-2-2-2-3-2a2.4 2.4 0 0 1 1-4Z" />
      <path d="m6 7-3-4-1 4 3 4m13 5 4-1-1 5-3 2M9 8l-2 4m6-1-4 2m6 2-4 2m6 0-3 4" />
    </svg>
  );
}
