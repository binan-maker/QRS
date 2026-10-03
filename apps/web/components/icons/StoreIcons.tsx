import React from "react";

export function GooglePlayOfficialIcon({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  const height = Math.round((size * 30) / 28);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 28 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path
        d="M1.22 0.82C0.89 1.17 0.7 1.72 0.7 2.43V27.57C0.7 28.28 0.89 28.83 1.22 29.18L1.3 29.26L15.39 15.17V14.83L1.3 0.74L1.22 0.82Z"
        fill="#00D2FF"
      />
      <path
        d="M20.08 19.86L15.39 15.17V14.83L20.09 10.14L20.2 10.2L25.76 13.36C27.35 14.26 27.35 15.74 25.76 16.64L20.2 19.8L20.08 19.86Z"
        fill="#FFCE00"
      />
      <path
        d="M20.2 19.8L15.39 15L1.22 29.18C1.74 29.73 2.61 29.8 3.58 29.25L20.2 19.8Z"
        fill="#FF3A44"
      />
      <path
        d="M20.2 10.2L3.58 0.75C2.61 0.2 1.74 0.27 1.22 0.82L15.39 15L20.2 10.2Z"
        fill="#00F076"
      />
    </svg>
  );
}

export function AppleOfficialIcon({
  className,
  size = 26,
}: {
  className?: string;
  size?: number;
}) {
  const height = Math.round((size * 30) / 26);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 384 512"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
