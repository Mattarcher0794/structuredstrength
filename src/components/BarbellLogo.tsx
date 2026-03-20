export function BarbellLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Bar */}
      <rect x="6" y="36" width="68" height="8" rx="2" fill="#2C2925" />
      {/* Left plate */}
      <rect x="6" y="22" width="12" height="36" rx="3" fill="#C4899A" />
      {/* Right plate */}
      <rect x="62" y="22" width="12" height="36" rx="3" fill="#C4899A" />
      {/* Left collar */}
      <rect x="22" y="28" width="5" height="24" rx="1.5" fill="#C4899A" opacity="0.55" />
      {/* Right collar */}
      <rect x="53" y="28" width="5" height="24" rx="1.5" fill="#C4899A" opacity="0.55" />
    </svg>
  );
}
