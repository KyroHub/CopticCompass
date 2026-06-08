import Image from "next/image";

import { SurfacePanel } from "@/components/SurfacePanel";
import type { Language } from "@/types/i18n";
import type { Tables } from "@/types/supabase";

import { getDashboardCopy } from "../lib/dashboardCopy";

export function DashboardWelcomePanel({
  locale,
  profile,
}: {
  locale: Language;
  profile: Tables<"profiles">;
}) {
  const copy = getDashboardCopy(locale);

  return (
    <SurfacePanel
      rounded="lg"
      className="flex items-center justify-between p-6 md:p-8"
    >
      <div>
        <h2 className="mb-2 text-2xl font-semibold text-ink">
          {copy.welcomeBack},{" "}
          {profile.full_name ? (
            <span className={`font-coptic tracking-wide`}>
              {profile.full_name}
            </span>
          ) : (
            copy.fallbackStudentName
          )}
          !
        </h2>
        <p className="font-medium text-muted">
          {copy.loggedInAs}{" "}
          <span className="font-bold text-accent-strong dark:text-accent">
            {profile.email}
          </span>
        </p>
      </div>
      {profile.avatar_url ? (
        <Image
          unoptimized
          src={profile.avatar_url}
          alt={copy.avatarAlt}
          width={64}
          height={64}
          className="hidden h-16 w-16 rounded-full border-2 border-surface object-cover shadow-sm md:block"
        />
      ) : null}
    </SurfacePanel>
  );
}
