import type { Metadata, Viewport } from "next";
import { EB_Garamond, Montserrat } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const verseFont = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-verse",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const uiFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Versuz — Bible Memory RPG",
  description: "Battle the dark with the Word.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#f5f0e8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${verseFont.variable} ${uiFont.variable}`}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
