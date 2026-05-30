"use client";

import imageCompression from "browser-image-compression";
import Image from "next/image";
import { useState } from "react";

import { updateProfile } from "@/actions/profile";
import { Button, buttonClassName } from "@/components/Button";
import { FormField } from "@/components/FormField";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getDashboardCopy } from "@/features/dashboard/lib/dashboardCopy";
import { antinoou } from "@/lib/fonts";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export function ProfileForm({
  profile,
  embedded = false,
}: {
  profile: Tables<"profiles">;
  embedded?: boolean;
}) {
  const { language } = useLanguage();
  const copy = getDashboardCopy(language);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [pendingAvatarStoragePath, setPendingAvatarStoragePath] = useState<
    string | null
  >(null);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const supabase = createClient();

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    try {
      setStatus(null);
      setIsUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error(copy.profile.selectImageError);
      }

      if (!supabase) {
        throw new Error(copy.profile.uploadUnavailableError);
      }

      const file = event.target.files[0];

      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 500,
        useWebWorker: true,
      };

      setStatus({ message: copy.profile.compressingImage, type: "success" });
      const compressedFile = await imageCompression(file, options);
      setStatus({ message: copy.profile.uploadingImage, type: "success" });

      const fileExt = file.name.split(".").pop() || "jpeg";
      const filePath = `${profile.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedFile);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      setPendingAvatarStoragePath(filePath);
      setTimeout(() => setStatus(null), 3000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : copy.profile.uploadUnknownError;
      setStatus({ message: errorMessage, type: "error" });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setStatus(null);
    if (pendingAvatarStoragePath && avatarUrl) {
      formData.set("avatar_url", avatarUrl);
    }

    const result = await updateProfile(formData);
    if (result.success) {
      if (supabase && pendingAvatarStoragePath) {
        try {
          const { data: existingFiles, error: listError } =
            await supabase.storage
              .from("avatars")
              .list(profile.id, { limit: 100 });

          if (listError) {
            throw listError;
          }

          const staleFilePaths = (existingFiles ?? [])
            .map((existingFile) => `${profile.id}/${existingFile.name}`)
            .filter((filePath) => filePath !== pendingAvatarStoragePath);

          if (staleFilePaths.length > 0) {
            const { error: removeError } = await supabase.storage
              .from("avatars")
              .remove(staleFilePaths);

            if (removeError) {
              throw removeError;
            }
          }
        } catch (error) {
          console.warn(
            "Failed to prune old avatars after profile update.",
            error,
          );
        }
      }

      setPendingAvatarStoragePath(null);
      setStatus({ message: copy.profile.updatedSuccess, type: "success" });
      setTimeout(() => setStatus(null), 3000);
    } else {
      setStatus({
        message: result.error || copy.profile.updateFailed,
        type: "error",
      });
    }
  }

  const content = (
    <div className="flex flex-col items-start gap-8 md:flex-row">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-elevated shadow-sm">
          {avatarUrl ? (
            <Image
              unoptimized
              src={avatarUrl}
              alt={copy.profile.avatarAlt}
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-muted">{copy.profile.noAvatar}</span>
          )}
        </div>
        <div>
          <label
            className={buttonClassName({
              className: "relative cursor-pointer",
              size: "sm",
              variant: "secondary",
            })}
            htmlFor="single"
          >
            {isUploading ? copy.profile.uploadPending : copy.profile.uploadIdle}
          </label>
          <input
            style={{
              visibility: "hidden",
              position: "absolute",
            }}
            type="file"
            id="single"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={isUploading}
          />
        </div>
      </div>

      <form action={handleSubmit} className="w-full flex-1 space-y-6 text-ink">
        <FormField htmlFor="full_name" label={copy.profile.fullNameLabel}>
          <input
            id="full_name"
            name="full_name"
            type="text"
            className={`input-base ${antinoou.className} tracking-wide`}
            defaultValue={profile.full_name || ""}
            placeholder={copy.profile.fullNamePlaceholder}
          />
        </FormField>

        <FormField htmlFor="email" label={copy.profile.emailLabel}>
          <input
            id="email"
            type="email"
            className="input-base bg-elevated text-muted"
            defaultValue={profile.email || ""}
            disabled
          />
          <p className="mt-1 text-xs text-muted">{copy.profile.emailHint}</p>
        </FormField>

        <Button
          type="submit"
          disabled={isUploading}
          fullWidth
          className="md:w-auto"
        >
          {copy.profile.saveChanges}
        </Button>

        {status && (
          <StatusNotice tone={status.type} className="mt-4">
            {status.message}
          </StatusNotice>
        )}
      </form>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <SurfacePanel rounded="lg" className="p-6 md:p-8">
      <h3 className="mb-6 text-xl font-semibold text-ink">
        {copy.profile.sectionTitle}
      </h3>
      {content}
    </SurfacePanel>
  );
}
