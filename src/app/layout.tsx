import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Archivo, Courier_Prime } from "next/font/google";
import { SessionProvider } from "@/session/SessionProvider";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier-prime",
});

export const metadata: Metadata = {
  title: "House Money",
  description: "A practice casino with play money: blackjack, baccarat, roulette and craps.",
};

export const viewport: Viewport = {
  themeColor: "#2A1810",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${courierPrime.variable}`}>
      <body>
        <noscript>
          <p>House Money needs JavaScript to run.</p>
        </noscript>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
