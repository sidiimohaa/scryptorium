import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, EB_Garamond, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});
const garamond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});
const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["300", "400", "500"], display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "SCRYPTORIUM — Bibliothèque vivante", template: "%s · SCRYPTORIUM" },
  description: "Chaque livre est une porte vers un autre monde. Bibliothèque personnelle, fiches de lecture et club littéraire.",
  openGraph: { type: "website", locale: "fr_FR", siteName: "SCRYPTORIUM" },
};

export const viewport: Viewport = { themeColor: "#11100F", colorScheme: "dark" };

// Applied before paint so the reduced-motion preference never flashes.
const motionScript = `try{var m=localStorage.getItem("scr-motion");if(m)document.documentElement.dataset.motion=m}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${garamond.variable} ${jost.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
