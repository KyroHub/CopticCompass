"use client";

import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/Badge";
import { SurfacePanel } from "@/components/SurfacePanel";
import {
  getLocalizedPublicationText,
  getPublicationImage,
  getPublicationImageRoleLabel,
  getPublicationImages,
  type Publication,
  type PublicationImage,
} from "@/features/publications/lib/publications";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

type PublicationImageGalleryProps = {
  language: Language;
  placeholderLabel: string;
  publication: Publication;
};

function getImageLabel(image: PublicationImage, language: Language) {
  return getPublicationImageRoleLabel(image.role, language);
}

export function PublicationImageGallery({
  language,
  placeholderLabel,
  publication,
}: PublicationImageGalleryProps) {
  const images = getPublicationImages(publication);
  const primaryImage =
    getPublicationImage(publication, "front-cover") ?? images[0] ?? null;
  const [selectedImageId, setSelectedImageId] = useState(
    primaryImage?.id ?? "",
  );
  const selectedImage =
    images.find((image) => image.id === selectedImageId) ?? primaryImage;
  const galleryLabel =
    language === "nl" ? "Publicatieafbeeldingen" : "Publication images";
  const usesCompactControls = images.length >= 3;

  return (
    <SurfacePanel
      as="section"
      aria-label={galleryLabel}
      backdropBlur={false}
      rounded="lg"
      shadow="soft"
      variant="elevated"
      className="relative overflow-hidden p-4 sm:p-5"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg border border-line/80 bg-paper">
        {selectedImage ? (
          <Image
            key={selectedImage.id}
            src={selectedImage.src}
            alt={getLocalizedPublicationText(
              selectedImage.alt,
              language,
              publication.lang,
            )}
            fill
            sizes="(min-width: 1024px) 352px, calc(100vw - 6rem)"
            className={cx(
              "object-contain object-center",
              selectedImage.role === "front-cover" ? "p-2" : "p-0",
            )}
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-elevated p-6">
            <div className="max-w-[14rem] text-center">
              <Badge tone="surface" size="sm" className="mb-4">
                {placeholderLabel}
              </Badge>
              <p className="text-sm font-semibold leading-7 text-muted">
                {publication.title}
              </p>
            </div>
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div
          className={cx(
            "mt-4 grid gap-2",
            usesCompactControls ? "grid-cols-3" : "sm:grid-cols-2",
          )}
          role="group"
          aria-label={galleryLabel}
        >
          {images.map((image) => {
            const label = getImageLabel(image, language);
            const isSelected = image.id === selectedImage?.id;

            return (
              <button
                key={image.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedImageId(image.id)}
                className={cx(
                  "flex min-w-0 rounded-lg border p-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
                  usesCompactControls
                    ? "flex-col items-center justify-center gap-1.5 text-center"
                    : "items-center gap-2 text-left",
                  isSelected
                    ? "border-accent/55 bg-accent-soft/60 text-ink"
                    : "border-line bg-surface text-muted hover:border-accent/35 hover:text-ink",
                )}
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-line/70 bg-paper">
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    loading="eager"
                    sizes="40px"
                    className="object-contain object-center"
                  />
                </span>
                <span className="min-w-0 whitespace-nowrap leading-5">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </SurfacePanel>
  );
}
