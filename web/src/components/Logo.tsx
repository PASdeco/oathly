export function Logo({
  variant = "auto",
  size = 30,
}: {
  variant?: "auto" | "light" | "on-color";
  size?: number;
}) {
  if (variant === "on-color") {
    return (
      <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="13" fill="none" stroke="#fff" strokeWidth="3" />
        <path
          d="M9 15.5 L13.5 20 L21.5 10.5"
          fill="none"
          stroke="#FFE45C"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
      className="text-[var(--ink)]"
    >
      <circle
        cx="15"
        cy="15"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        d="M9 15.5 L13.5 20 L21.5 10.5"
        fill="none"
        stroke="#2B3BFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-serif-oath text-[28px] leading-none">
      <Logo variant="auto" size={30} />
      Oathly
    </span>
  );
}
