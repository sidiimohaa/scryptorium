"use client";
import Link from "next/link";
import { useState } from "react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost px-3"
      >
        <span className="sr-only">Menu</span>
        <span aria-hidden className="flex w-5 flex-col gap-[5px]">
          <span className={`h-px bg-current transition ${open ? "translate-y-[6px] rotate-45" : ""}`} />
          <span className={`h-px bg-current transition ${open ? "opacity-0" : ""}`} />
          <span className={`h-px bg-current transition ${open ? "-translate-y-[6px] -rotate-45" : ""}`} />
        </span>
      </button>
      {open && (
        <nav id="mobile-nav" aria-label="Navigation mobile" className="fixed inset-x-0 top-16 z-50 border-b border-line bg-ink/95 px-6 py-8 backdrop-blur-md">
          <ul className="flex flex-col gap-5">
            {items.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="font-[family-name:var(--font-display)] text-3xl text-cream">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
