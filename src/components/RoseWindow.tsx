import { useId } from "react";

/** Rosace de verre sertie de plomb, autour des armoiries originales du seuil. */
export function RoseWindow({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const colors = ["#2757a8", "#713fa0", "#b82e64", "#287d9d", "#a22c42", "#cc9846"];
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Rosace en vitrail aux armoiries de SCRYPTORIUM">
      <defs>
        <radialGradient id={`${id}-glass`} cx="42%" cy="35%" r="70%">
          <stop stopColor="#5079bc" />
          <stop offset="0.6" stopColor="#202e63" />
          <stop offset="1" stopColor="#101931" />
        </radialGradient>
        <radialGradient id={`${id}-light`}>
          <stop stopColor="#fff1bc" stopOpacity="0.18" />
          <stop offset="1" stopColor="#a5bfff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-center`}><circle cx="200" cy="200" r="103" /></clipPath>
      </defs>
      <circle cx="200" cy="200" r="195" fill="#29221d" stroke="#0d0a09" strokeWidth="7" />
      <circle cx="200" cy="200" r="185" fill={`url(#${id}-glass)`} stroke="#746047" strokeWidth="3" />
      <g stroke="#100e18" strokeWidth="3" strokeLinejoin="round">
        {Array.from({ length: 16 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 22.5} 200 200)`}>
            <path d="M192 88 Q174 65 200 25 Q226 65 208 88 L200 94 Z" fill={colors[i % colors.length]} />
            <path d="M200 31 V86 M185 60 L215 60 M187 73 L213 73" fill="none" strokeWidth="1.4" />
            <path d="M200 44 L208 56 L200 67 L192 56 Z" fill={colors[(i + 2) % colors.length]} />
            <circle cx="200" cy="78" r="4" fill="#dfb669" />
            <path d="M213 39 Q222 26 232 36 Q235 48 223 54 Z" fill={colors[(i + 1) % colors.length]} />
          </g>
        ))}
        <circle cx="200" cy="200" r="110" fill="#b68b49" />
        <circle cx="200" cy="200" r="104" fill={`url(#${id}-glass)`} />
      </g>
      <g clipPath={`url(#${id}-center)`}>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M200 96 L200 304 M96 200 H304" transform={`rotate(${i * 15} 200 200)`} stroke="#6876a7" strokeWidth="0.6" opacity="0.2" />
        ))}
        <image href="/brand/armoiries-vitrail-480.webp" x="130" y="103" width="140" height="194" preserveAspectRatio="xMidYMid meet" />
        <circle cx="200" cy="200" r="103" fill={`url(#${id}-light)`} className="vitrail-sun" />
      </g>
      <circle cx="200" cy="200" r="182" fill="none" stroke="#b38f62" strokeWidth="2" strokeDasharray="2 8" />
      <circle cx="200" cy="200" r="104" fill="none" stroke="#100e18" strokeWidth="3" />
    </svg>
  );
}
