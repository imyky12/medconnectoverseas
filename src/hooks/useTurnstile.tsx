import { useCallback, useRef, useState } from "react";

/**
 * Cloudflare Turnstile for the public forms.
 *
 * Added after a bot began posting an enquiry every few minutes through the
 * contact form, each one emailing the admins and an acknowledgement to a
 * stranger's address. The honeypot in components/honeypot catches lazy bots;
 * this catches the rest without making a real student solve anything: for
 * almost everyone the widget ticks itself within a second or two.
 *
 * The widget is deliberately *visible*, and each form reveals its submit
 * button only once `ready` is true. An invisible check that silently gates the
 * button would look like a broken form — the person would see a button that
 * does nothing, or appears from nowhere, with no idea why.
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

/**
 * `size` is passed through to Turnstile. "flexible" fills the width of its
 * container, which suits a form's submit area; "compact" is for a narrow
 * column such as the footer, where the standard 300px widget would overflow.
 */
export function useTurnstile(
  { size = "flexible" }: { size?: "normal" | "flexible" | "compact" } = {}
) {
  const widgetId = useRef<string | null>(null);
  // Guards the gap between asking for the script and it arriving: without it,
  // two attaches in quick succession (React's development double-invoke) both
  // pass the widgetId check and draw two widgets into the same div.
  const starting = useRef(false);
  const [token, setToken] = useState("");
  // Set when the widget cannot run at all — script blocked by an extension,
  // a network that filters Cloudflare, or Turnstile erroring out. Without
  // this the submit button would never appear and the form would be dead with
  // nothing on screen explaining why. Letting the submit through is safe: the
  // server verifies the token independently, so this only affects what is
  // drawn, never what is accepted.
  const [failed, setFailed] = useState(false);

  /**
   * A callback ref rather than a `useEffect` over `container.current`.
   *
   * The newsletter gate is a modal that returns null while closed, so its div
   * does not exist when an effect would first run — the widget was never drawn,
   * the token never arrived, and with the submit button gated on that token the
   * modal became a dead end with nothing on screen to explain it. React calls
   * this the moment the div actually mounts, however late that is, and again
   * with null when it goes away.
   */
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      if (!SITE_KEY) return;

      if (el === null) {
        if (widgetId.current && window.turnstile) {
          window.turnstile.remove(widgetId.current);
        }
        widgetId.current = null;
        starting.current = false;
        // The removed widget's token is gone with it. Clearing this matters
        // when the modal is closed and reopened: a stale token would reveal
        // the submit button before the new widget had solved anything.
        setToken("");
        return;
      }

      if (widgetId.current || starting.current) return;
      starting.current = true;

      loadTurnstileScript()
        .then(() => {
          // `isConnected` covers the div being unmounted while the script was
          // still loading — rendering into a detached node leaves an orphan
          // widget that never solves.
          if (!window.turnstile || widgetId.current || !el.isConnected) return;

          widgetId.current = window.turnstile.render(el, {
            sitekey: SITE_KEY,
            callback: (value: string) => setToken(value),
            // A token expires in roughly five minutes. Someone who opens the
            // contact page, writes a long message and then submits would send
            // a stale one, so it is dropped here and the widget re-solves.
            "expired-callback": () => setToken(""),
            "error-callback": () => {
              setToken("");
              setFailed(true);
            },
            theme: "light",
            size,
          });
        })
        .catch(() => {
          // Left silent for the visitor, but the form must not stay locked.
          setFailed(true);
        })
        .finally(() => {
          starting.current = false;
        });
    },
    [size]
  );

  /** Call after every submit attempt — the token just used is now spent. */
  const reset = useCallback(() => {
    setToken("");
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, []);

  const widget = <div ref={attach} className="flex justify-center empty:hidden" />;

  const enabled = Boolean(SITE_KEY);

  return {
    token,
    widget,
    reset,
    enabled,
    /**
     * Whether the form may show its submit button.
     *
     * True with no site key configured, or when the widget could not run at
     * all — in both cases gating the button would only break the form for a
     * real person, and the server is still the thing deciding what to accept.
     */
     ready: !enabled || Boolean(token) || failed,
  };
}
