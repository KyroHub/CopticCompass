import { AuthGateNotice } from "@/components/AuthGateNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { cx } from "@/lib/classes";

import type { ReactNode } from "react";

type ShenuteConversationShellProps = {
  accessMessage: string;
  children: ReactNode;
  isAccessBlocked: boolean;
  title: string;
};

export function ShenuteConversationShell({
  accessMessage,
  children,
  isAccessBlocked,
  title,
}: ShenuteConversationShellProps) {
  return (
    <SurfacePanel
      rounded="lg"
      shadow="panel"
      className="relative overflow-hidden"
    >
      {isAccessBlocked ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-surface/10 backdrop-brightness-95 dark:bg-paper/10"
          />
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 md:p-10">
            <AuthGateNotice
              actionClassName="px-6"
              align="center"
              className="w-full max-w-lg shadow-panel"
              size="comfortable"
              title={title}
            >
              {accessMessage}
            </AuthGateNotice>
          </div>
        </>
      ) : null}

      <div
        className={cx(
          "flex h-[calc(100dvh-9rem)] min-h-[24rem] flex-col transition-all duration-300 sm:h-[calc(100dvh-10rem)] md:h-[calc(100dvh-20rem)] md:min-h-[26rem] lg:h-[calc(100dvh-21rem)] lg:min-h-[24rem]",
          isAccessBlocked &&
            "pointer-events-none select-none blur-[6px] opacity-70",
        )}
      >
        {children}
      </div>
    </SurfacePanel>
  );
}
