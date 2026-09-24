type LogoProps = { size?: number; withWordmark?: boolean };

/** Inline SVG version of the CareerHub mark — crisp at any size, no network request. */
export default function Logo({ size = 32, withWordmark = false }: LogoProps) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ch-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2e6ef2" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ch-grad)" />
      <path d="M40.5 22.5a12 12 0 1 0 0 19" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <rect x="38" y="29.5" width="16" height="5" rx="2.5" fill="#fff" />
      <circle cx="50" cy="32" r="4.6" fill="#0b1e3a" />
      <circle cx="50" cy="32" r="2.2" fill="#7ff0c4" />
    </svg>
  );
  if (!withWordmark) return mark;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      {mark}
      <span style={{ fontWeight: 800, letterSpacing: '0.08em', fontSize: size * 0.5 }}>
        CAREER<span style={{ color: '#2e6ef2' }}>HUB</span>
      </span>
    </span>
  );
}
