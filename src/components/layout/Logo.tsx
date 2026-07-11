import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 155 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Letter 'm' */}
      <path
        d="M 9 39 L 9 20 C 9 15, 13 11, 19 11 C 24 11, 28 15, 28 20 L 28 39 L 28 20 C 28 15, 32 11, 38 11 C 43 11, 47 20, 47 20 L 47 39"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter 'o' (Orange Wheel) */}
      <g>
        {/* Spokes */}
        <g stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="66" y1="12" x2="66" y2="38" />
          <line x1="53" y1="25" x2="79" y2="25" />
          <line x1="57" y1="16" x2="75" y2="34" />
          <line x1="75" y1="16" x2="57" y2="34" />
        </g>
        {/* Outer Tire */}
        <circle
          cx="66"
          cy="25"
          r="16"
          stroke="var(--primary)"
          strokeWidth="3.5"
          fill="none"
        />
        {/* Inner Rim */}
        <circle
          cx="66"
          cy="25"
          r="12.5"
          stroke="var(--primary)"
          strokeWidth="1.2"
          fill="none"
        />
        {/* Hub Cover */}
        <circle cx="66" cy="25" r="3.5" fill="var(--primary)" />
      </g>

      {/* Letter 't' */}
      <path
        d="M 98 10 L 98 35 C 98 38, 100 40, 104 40 M 90 20 L 105 20"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter 'o' (Orange Helmet) */}
      <g
        transform="translate(108, 8)"
        stroke="var(--primary)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Outer Shell */}
        <path d="M 6 32 C 2 32, 0 27, 0 20 C 0 8, 9 2, 21 2 C 32 2, 38 8, 40 16 C 41 20, 41 24, 40 27 C 38 31, 32 30, 27 30 C 22 30, 8 32, 6 32 Z" />
        {/* Visor */}
        <path
          d="M 19 11 C 26 11, 32 13, 35 16 C 37 18, 36 21, 35 23 C 32 25, 26 25, 20 24 C 18 23.5, 17 20, 17 18 C 17 14, 18 12, 19 11 Z"
          strokeWidth="2"
        />
        {/* Pivot mechanism */}
        <circle cx="15" cy="18" r="1.2" fill="var(--primary)" stroke="none" />
        {/* Vent details */}
        <path d="M 33 26 L 35 26" strokeWidth="1.5" />
        <path d="M 23 5 C 25 5, 27 6, 28 7" stroke-width="1.5" />
      </g>
    </svg>
  );
}
