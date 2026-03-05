"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type GoogleOneTapProps = {
  googleClientId: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  nextPath: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            nonce: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function generateNonce(length = 32) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  values.forEach((value) => {
    text += charset[value % charset.length];
  });
  return text;
}

export default function GoogleOneTap({
  googleClientId,
  supabaseUrl,
  supabasePublishableKey,
  nextPath
}: GoogleOneTapProps) {
  const router = useRouter();

  async function initializeGoogleOneTap() {
    if (!window.google) {
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabasePublishableKey);

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      router.push(nextPath);
      router.refresh();
      return;
    }

    const nonce = generateNonce();

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async (response) => {
        await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          nonce
        });

        router.push(nextPath);
        router.refresh();
      },
      nonce,
      use_fedcm_for_prompt: true
    });

    window.google.accounts.id.prompt();
  }

  if (!googleClientId || !supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={initializeGoogleOneTap}
    />
  );
}
