import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftSnap",
  description: "Clinical handoff copilot"
};

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <main>
          <aside className="warningbar" role="note" aria-label="Test environment warning">
            Test environment only. Do not use real patient/production data. Accounts and data may
            be reset or deleted at any time.
          </aside>
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
            <div className="brandactions">
              {user ? <small>{user.email}</small> : null}
              {user ? <LogoutButton /> : null}
            </div>
          </header>
          {children}
        </main>
      </body>
    </html>
  );
}
