"use client";

import { useEffect } from "react";

type BodyScrollLockOptions = {
  lockDocumentElement?: boolean;
};

let bodyLockCount = 0;
let documentElementLockCount = 0;
let originalBodyOverflow = "";
let originalDocumentElementOverflow = "";

function lockBodyOverflow() {
  if (bodyLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  bodyLockCount += 1;
}

function unlockBodyOverflow() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);

  if (bodyLockCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
  }
}

function lockDocumentElementOverflow() {
  if (documentElementLockCount === 0) {
    originalDocumentElementOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }

  documentElementLockCount += 1;
}

function unlockDocumentElementOverflow() {
  documentElementLockCount = Math.max(0, documentElementLockCount - 1);

  if (documentElementLockCount === 0) {
    document.documentElement.style.overflow = originalDocumentElementOverflow;
  }
}

export function useBodyScrollLock(
  isLocked: boolean,
  { lockDocumentElement = false }: BodyScrollLockOptions = {},
) {
  useEffect(() => {
    if (!isLocked) {
      return;
    }

    lockBodyOverflow();

    if (lockDocumentElement) {
      lockDocumentElementOverflow();
    }

    return () => {
      if (lockDocumentElement) {
        unlockDocumentElementOverflow();
      }

      unlockBodyOverflow();
    };
  }, [isLocked, lockDocumentElement]);
}
