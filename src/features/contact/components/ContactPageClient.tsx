"use client";

import { ArrowRight, Mail, MessageSquare, User } from "lucide-react";
import { useActionState } from "react";

import { sendContactEmail, type ContactFormState } from "@/actions/contact";
import { AppPageIntro } from "@/components/AppPageIntro";
import { Button } from "@/components/Button";
import { CheckboxField } from "@/components/CheckboxField";
import { elevatedPanelClassName } from "@/components/ElevatedPanel";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { contactInquiryOptions } from "@/features/contact/lib/contact";
import { getLocalizedHomePath } from "@/lib/locale";

export default function ContactPageClient() {
  const { language, t } = useLanguage();
  const [state, formAction, isPending] = useActionState<
    ContactFormState | null,
    FormData
  >(sendContactEmail, null);

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.topLeftGoldWash,
        pageShellAccents.bottomRightCopticWash,
      ]}
    >
      <AppPageIntro
        align="center"
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.contact") },
        ]}
        description={t("contact.subtitle")}
        title={t("contact.title")}
      />

      <div className="mx-auto w-full max-w-3xl">
        <SurfacePanel rounded="lg" className="p-8 md:p-10">
          <form action={formAction} className="space-y-8">
            <input
              type="text"
              name="website"
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
            <input type="hidden" name="locale" value={language} />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField htmlFor="name" label={t("contact.name")}>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                    size={20}
                  />
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    className="input-base pl-12"
                    placeholder={t("contact.namePlaceholder")}
                  />
                </div>
              </FormField>

              <FormField htmlFor="email" label={t("contact.email")}>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                    size={20}
                  />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className="input-base pl-12"
                    placeholder={t("contact.emailPlaceholder")}
                  />
                </div>
              </FormField>
            </div>

            <FormField htmlFor="inquiryType" label={t("contact.inquiry")}>
              <select
                id="inquiryType"
                name="inquiryType"
                required
                defaultValue=""
                className="select-base"
              >
                <option value="" disabled>
                  {t("contact.select")}
                </option>
                {contactInquiryOptions.map((option) => {
                  const optionLabel = t(option.labelKey);
                  return (
                    <option key={option.value} value={option.value}>
                      {optionLabel}
                    </option>
                  );
                })}
              </select>
            </FormField>

            <FormField htmlFor="message" label={t("contact.message")}>
              <div className="relative">
                <MessageSquare
                  className="absolute left-4 top-4 text-muted"
                  size={20}
                />
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={7}
                  className="textarea-base resize-y pl-12"
                  placeholder={t("contact.messagePlaceholder")}
                />
              </div>
            </FormField>

            <FormField
              htmlFor="wants_updates"
              label={t("contact.updatesLabel")}
              className={elevatedPanelClassName({ className: "p-4" })}
            >
              <CheckboxField
                id="wants_updates"
                name="wants_updates"
                value="true"
                label={t("contact.updatesHint")}
                wrapperClassName="-m-2"
              />
            </FormField>

            <Button type="submit" disabled={isPending} fullWidth>
              {isPending ? t("contact.sending") : t("contact.send")}
              <ArrowRight size={20} />
            </Button>

            {state?.success && (
              <StatusNotice tone="success">
                {state.message ?? t("contact.success")}
              </StatusNotice>
            )}

            {state?.error && (
              <StatusNotice tone="error">{state.error}</StatusNotice>
            )}
          </form>
        </SurfacePanel>
      </div>
    </PageShell>
  );
}
