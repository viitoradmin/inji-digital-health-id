import { useId } from "react";
import { cn } from "@/lib/utils";

type CertifyLogoMarkProps = {
  className?: string;
  size?: number;
};

/** Circular shield mark — matches assets/certify-logo-mark.svg */
export function CertifyLogoMark({ className, size = 36 }: CertifyLogoMarkProps) {
  const gradId = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5B4FD9" />
          <stop offset="0.5" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${gradId})`} />
      <path
        d="M20 11.5 26.5 14.5V20.2C26.5 24.1 23.6 27.6 20 28.8 16.4 27.6 13.5 24.1 13.5 20.2V14.5L20 11.5Z"
        stroke="white"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17.2 20.1 19.1 22.2 23.1 17.8"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
