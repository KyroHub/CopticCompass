type ResendEmailTag = {
  name: string;
  value: string;
};

type ResendEmailResult =
  | {
      id: string | null;
      success: true;
    }
  | {
      error: string;
      status: number | null;
      success: false;
    };

type ResendEmailOptions = {
  apiKey: string;
  from: string;
  subject: string;
  text: string;
  to: string[];
  bcc?: string[];
  cc?: string[];
  html?: string | null;
  idempotencyKey?: string;
  replyTo?: string[];
  tags?: ResendEmailTag[];
};

function nonEmptyArray<T>(value: T[] | undefined) {
  return value && value.length > 0 ? value : null;
}

function buildResendEmailPayload(options: ResendEmailOptions) {
  return {
    ...(nonEmptyArray(options.bcc) ? { bcc: options.bcc } : {}),
    ...(nonEmptyArray(options.cc) ? { cc: options.cc } : {}),
    ...(options.html ? { html: options.html } : {}),
    ...(nonEmptyArray(options.replyTo) ? { reply_to: options.replyTo } : {}),
    ...(nonEmptyArray(options.tags) ? { tags: options.tags } : {}),
    from: options.from,
    subject: options.subject,
    text: options.text,
    to: options.to,
  };
}

export async function sendResendEmail(
  options: ResendEmailOptions,
): Promise<ResendEmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify(buildResendEmailPayload(options)),
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        ...(options.idempotencyKey
          ? { "Idempotency-Key": options.idempotencyKey }
          : {}),
      },
      method: "POST",
    });

    if (response.ok) {
      const data = (await response.json()) as { id?: string };
      return { success: true, id: data.id ?? null };
    }

    return {
      success: false,
      error: (await response.text()) || "Failed to send email via Resend.",
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Network error while sending email via Resend.",
      status: null,
    };
  }
}
