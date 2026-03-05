import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftSnap",
  description: "Clinical handoff copilot"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main>
          <header className="brandbar">
            <Link href="/" className="brandlink" aria-label="ShiftSnap home">
              <Image
                src="/shiftsnap-logo.svg"
                alt="ShiftSnap"
                width={240}
                height={64}
                priority
              />
            </Link>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
