/**
 * A field only a bot will fill in.
 *
 * Added after a bot found the contact form and posted a fake enquiry every few
 * minutes, each one emailing the admins and sending an acknowledgement to a
 * stranger's real address. A CAPTCHA would stop it too, at the cost of making
 * every genuine student prove they are human before they can ask a question.
 * This costs them nothing: they never see it.
 *
 * Every detail below is doing work, so change it carefully:
 *  - positioned off-screen instead of `display: none` or `hidden`, because the
 *    better bots skip fields that are obviously not rendered;
 *  - `tabIndex={-1}` so keyboard users cannot land on it by tabbing;
 *  - `aria-hidden` so a screen reader never announces it;
 *  - `autoComplete="off"` so a password manager does not helpfully fill it in
 *    and get a real person silently discarded;
 *  - named `website`, which is plausible enough that a form-filling bot wants
 *    to complete it. The server checks this exact name — see
 *    backend/src/utils/spamGuard.ts.
 */
import { useId } from "react";

export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // The contact page renders this twice — once in its own form, once in the
  // footer's newsletter form — so the id has to be generated. The `name`
  // stays `website` in both: that is what the server reads, and duplicate
  // names across two separate forms are harmless.
  const id = useId();

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label htmlFor={id}>Website (leave this empty)</label>
      <input
        id={id}
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
