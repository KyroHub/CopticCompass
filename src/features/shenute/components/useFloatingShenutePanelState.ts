import { useEffect, useState } from "react";

const LAUNCHER_SCROLLING_OPACITY = 0.52;
const LAUNCHER_SCROLL_IDLE_DELAY_MS = 720;

type UseFloatingShenutePanelStateOptions = {
  initialOpen: boolean;
};

export function useFloatingShenutePanelState({
  initialOpen,
}: UseFloatingShenutePanelStateOptions) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [launcherOpacity, setLauncherOpacity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    let restoreTimeout: number | undefined;
    const handleScroll = () => {
      setLauncherOpacity(LAUNCHER_SCROLLING_OPACITY);
      if (restoreTimeout !== undefined) {
        window.clearTimeout(restoreTimeout);
      }
      restoreTimeout = window.setTimeout(() => {
        setLauncherOpacity(1);
        restoreTimeout = undefined;
      }, LAUNCHER_SCROLL_IDLE_DELAY_MS);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (restoreTimeout !== undefined) {
        window.clearTimeout(restoreTimeout);
      }
    };
  }, [isOpen]);

  return {
    isOpen,
    launcherOpacity,
    setIsOpen,
  };
}
