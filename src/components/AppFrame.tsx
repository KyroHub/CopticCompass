import { Footer } from "@/components/Footer";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { Language } from "@/types/i18n";

import type { ReactNode } from "react";

type AppFrameProps = {
  children: ReactNode;
  initialLanguage: Language;
  localeRouting?: boolean;
  nonce?: string;
};

/**
 * Wraps the shared site chrome around a route subtree while allowing the app
 * shell to opt into a CSP nonce only when its root layout requires one.
 */
export function AppFrame({
  children,
  initialLanguage,
  localeRouting = false,
  nonce,
}: AppFrameProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      nonce={nonce}
    >
      <LanguageProvider
        initialLanguage={initialLanguage}
        localeRouting={localeRouting}
      >
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingAiAssistant />
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}
