import { env } from '../../config/env';

/**
 * Thin HTTP wrapper over the ZeptoMail Send Email API.
 * No business logic, no database — mailer.ts owns both.
 *
 * We post rendered HTML via `htmlbody` rather than using the template endpoint,
 * so templates stay versioned in git instead of in the ZeptoMail dashboard.
 */

export interface ZeptoAddress {
  address: string;
  name?: string;
}

export interface ZeptoAttachment {
  /** base64 content */
  content: string;
  mime_type: string;
  name: string;
}

export interface ZeptoInlineImage {
  /** base64 content */
  content: string;
  mime_type: string;
  /** Referenced from the HTML as src="cid:<cid>" */
  cid: string;
}

export interface SendEmailInput {
  from: ZeptoAddress;
  to: ZeptoAddress[];
  cc?: ZeptoAddress[];
  bcc?: ZeptoAddress[];
  replyTo?: ZeptoAddress;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: ZeptoAttachment[];
  inlineImages?: ZeptoInlineImage[];
  clientReference?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface SendEmailResult {
  ok: boolean;
  httpStatus: number;
  messageId?: string;
  requestId?: string;
  /** True for 5xx and network errors — the caller should schedule a retry. */
  retryable: boolean;
  errorMessage?: string;
  errorCode?: string;
  raw?: unknown;
}

/**
 * ZeptoMail's dashboard shows the send token as a full header value already
 * carrying the "Zoho-enczapikey " scheme, but its docs show the bare key. Both
 * end up in .env files in the wild, and prepending the scheme twice makes the
 * API answer with an opaque HTTP 500 and an empty body — no useful error at
 * all. Accept either form.
 */
function authorizationHeader(): string {
  const token = env.ZEPTOMAIL_TOKEN.trim();
  return token.startsWith('Zoho-enczapikey') ? token : `Zoho-enczapikey ${token}`;
}

const wrap = (list: ZeptoAddress[]) =>
  list.map((a) => ({ email_address: { address: a.address, name: a.name || undefined } }));

/** Keep the stored provider payload small — these rows are kept forever. */
const trim = (value: unknown): unknown => {
  try {
    const json = JSON.stringify(value);
    return json.length > 2000 ? { truncated: true, body: json.slice(0, 2000) } : value;
  } catch {
    return undefined;
  }
};

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const payload: Record<string, unknown> = {
    from: { address: input.from.address, name: input.from.name },
    to: wrap(input.to),
    subject: input.subject,
    htmlbody: input.htmlBody,
  };

  if (input.textBody) payload.textbody = input.textBody;
  if (input.cc?.length) payload.cc = wrap(input.cc);
  if (input.bcc?.length) payload.bcc = wrap(input.bcc);
  if (input.replyTo) {
    payload.reply_to = [{ address: input.replyTo.address, name: input.replyTo.name }];
  }
  if (input.attachments?.length) payload.attachments = input.attachments;
  if (input.inlineImages?.length) payload.inline_images = input.inlineImages;
  if (input.clientReference) payload.client_reference = input.clientReference;
  if (input.trackOpens !== undefined) payload.track_opens = input.trackOpens;
  if (input.trackClicks !== undefined) payload.track_clicks = input.trackClicks;

  // 20s ceiling — the worker should never be blocked by a hanging provider.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(env.ZEPTOMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: authorizationHeader(),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let body: any;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    if (response.ok) {
      return {
        ok: true,
        httpStatus: response.status,
        messageId: body?.data?.[0]?.message_id ?? body?.request_id,
        requestId: body?.request_id,
        retryable: false,
        raw: trim(body),
      };
    }

    // 4xx is our fault (bad address, unverified sender, malformed payload) and
    // will fail identically on every retry. Only 429 and 5xx are worth retrying.
    const retryable = response.status === 429 || response.status >= 500;

    return {
      ok: false,
      httpStatus: response.status,
      requestId: body?.request_id,
      retryable,
      errorMessage:
        body?.error?.details?.[0]?.message ??
        body?.error?.message ??
        body?.message ??
        `ZeptoMail responded ${response.status}`,
      errorCode: body?.error?.code ?? body?.error?.details?.[0]?.code,
      raw: trim(body),
    };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      httpStatus: 0,
      retryable: true, // network failure / timeout — always worth another go
      errorMessage: isAbort ? 'ZeptoMail request timed out after 20s' : (err as Error).message,
      errorCode: isAbort ? 'ETIMEDOUT' : 'ENETWORK',
    };
  } finally {
    clearTimeout(timeout);
  }
}
