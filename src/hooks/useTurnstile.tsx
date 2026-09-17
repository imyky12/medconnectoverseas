import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile for the public forms.
 *
 * Added after a bot began posting an enquiry every few minutes through the
 * contact form, each one emailing the admins and an acknowledgement to a
 * stranger's address. The honeypot in components/honeypot catches lazy bots;
 * this catches the rest without making a real student solve anything — in
 * `interaction-only` mode the widget draws nothing at all unless Cloudflare
 * actually wants to challenge the visitor.
 *
 * The token the widget produces is single-use and short-lived. That is the one
 * thing to remember when wiring this into a form: after any submit, successful
 * or not, `reset()` must be called before the person can send again, or the
 * second attempt posts a spent token and the server rejects it.
 */

// A public identifier, not a credential — it ships inside the bundle by
// design, and the secret half lives only on the server. Absent in development
// and in any build made before the variable was added, in which case every
// form must keep working: `enabled` stays false and the server, which is also
// unconfigured or soon will be, skips the check to match.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

/**
 * Loaded once per page, not once per form.
 *
 * The footer's newsletter form and the contact form both render on the contact
 * page, and injecting the script twice makes Turnstile warn and misbehave. The
 * promise is module-level so the second caller waits on the first one's load
 * instead of starting another.
 */
let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Cleared so a later form can retry. A blocked script (an ad blocker, a
      // network that filters Cloudflare) must not permanently break the forms.
      scriptPromise = null;
      reject(new Error("Could not load the Turnstile script"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function useTurnstile() {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        // Two guards, both load-bearing: `cancelled` for an unmount mid-load,
        // and `widgetId` because React's development double-invoke of effects
        // would otherwise render two widgets into the same div.
        if (cancelled || !container.current || widgetId.current) return;
        if (!window.turnstile) return;

        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          callback: (value: string) => setToken(value),
          // A token expires in roughly five minutes. Someone who opens the
          // contact page, writes a long message and then submits would send a
          // stale one, so it is dropped here and the widget re-solves.
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
          // Draw nothing unless the visitor actually needs to be challenged.
          appearance: "interaction-only",
          theme: "light",
        });
      })
      .catch(() => {
        // Left silent for the visitor. The backend fails open when it cannot
        // reach Cloudflare, and the honeypot and rate limit still apply, so a
        // blocked script means a slightly weaker check — not a broken form.
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
      widgetId.current = null;
    };
  }, []);

  /** Call after every submit attempt — the token just used is now spent. */
  const reset = useCallback(() => {
    setToken("");
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, []);

  const widget = <div ref={container} />;

  return { token, widget, reset, enabled: Boolean(SITE_KEY) };
}
