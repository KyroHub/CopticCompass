import "@/app/globals.css";

import { NotFoundAppFrame } from "@/components/NotFoundAppFrame";
import { NotFoundPage } from "@/components/NotFoundPage";
import { ObservabilityScripts } from "@/components/ObservabilityScripts";
import { fontVariables } from "@/lib/fonts";
import { DEFAULT_LANGUAGE } from "@/lib/i18n";

export default function GlobalNotFound() {
  return (
    <html lang={DEFAULT_LANGUAGE} suppressHydrationWarning>
      <body className={fontVariables}>
        <NotFoundAppFrame preferredLanguage={DEFAULT_LANGUAGE}>
          <NotFoundPage />
        </NotFoundAppFrame>
        <ObservabilityScripts language={DEFAULT_LANGUAGE} />
      </body>
    </html>
  );
}
