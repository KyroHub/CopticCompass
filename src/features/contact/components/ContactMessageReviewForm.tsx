"use client";

import { updateContactMessageStatus } from "@/actions/admin";
import { buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import {
  CONTACT_MESSAGE_STATUSES,
  formatContactMessageStatus,
  type ContactMessageStatus,
} from "@/features/contact/lib/contact";

type ContactMessageReviewFormProps = {
  contactMessageId: string;
  status: ContactMessageStatus;
};

const contactMessageReviewFormCopy = {
  en: {
    label: "Inbox status",
    save: "Save status",
  },
  nl: {
    label: "Inboxstatus",
    save: "Status opslaan",
  },
} as const;

export function ContactMessageReviewForm({
  contactMessageId,
  status,
}: ContactMessageReviewFormProps) {
  const { language } = useLanguage();
  const copy = contactMessageReviewFormCopy[language];

  return (
    <form
      action={updateContactMessageStatus}
      className="space-y-4 rounded-lg border border-line bg-elevated/70 p-5"
    >
      <input type="hidden" name="contact_message_id" value={contactMessageId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <FormField
          htmlFor={`contact-message-status-${contactMessageId}`}
          label={copy.label}
          labelTone="muted"
          className="min-w-[14rem] flex-1"
        >
          <select
            id={`contact-message-status-${contactMessageId}`}
            name="status"
            defaultValue={status}
            className="select-base h-11 text-sm"
          >
            {CONTACT_MESSAGE_STATUSES.map((nextStatus) => (
              <option key={nextStatus} value={nextStatus}>
                {formatContactMessageStatus(nextStatus, language)}
              </option>
            ))}
          </select>
        </FormField>

        <button
          type="submit"
          className={buttonClassName({ className: "px-5" })}
        >
          {copy.save}
        </button>
      </div>
    </form>
  );
}
