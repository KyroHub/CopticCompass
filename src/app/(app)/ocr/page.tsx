"use client";

import { Camera, FileText, ScanSearch } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { processOCRImage } from "@/actions/ocrActions";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { getLocalizedHomePath } from "@/lib/locale";

/**
 * Provides a lightweight OCR workspace for testing Coptic image extraction
 * without leaving the shared app shell and form styling behind.
 */
export default function OCRPage() {
  const { language, t } = useLanguage();
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setImage(nextFile);
    setError("");

    if (!nextFile) {
      setResult("");
    }
  };

  const handleUpload = async () => {
    if (!image) {
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      formData.append("file", image);

      const extractedText = await processOCRImage(formData);
      setResult(extractedText);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Failed to process OCR.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      className="min-h-screen flex flex-col items-center p-6 pb-16 md:p-10"
      contentClassName="mx-auto w-full max-w-4xl space-y-8 pt-10"
      width="standard"
      accents={[
        pageShellAccents.heroSkyArc,
        pageShellAccents.topRightEmeraldOrbInset,
      ]}
    >
      <BreadcrumbTrail
        items={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: "Shenute OCR" },
        ]}
      />

      <SurfacePanel rounded="4xl" shadow="float" className="p-6 md:p-8">
        <PageHeader
          title="Shenute OCR"
          description="Upload a manuscript photo or scanned page and extract text into a reusable reading surface."
          align="left"
          size="compact"
          tone="sky"
        />
      </SurfacePanel>

      <SurfacePanel rounded="4xl" shadow="panel" className="p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-stone-700 dark:text-stone-200">
                Knowledge image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-stone-200 bg-white/80 px-3 py-2 text-sm text-stone-900 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-sky-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/35 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:file:bg-sky-900/40 dark:file:text-sky-200"
              />
            </label>

            {error ? (
              <StatusNotice tone="error" align="left">
                {error}
              </StatusNotice>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleUpload();
                }}
                disabled={!image || loading}
                className={buttonClassName({ className: "px-5" })}
              >
                <ScanSearch className="h-4 w-4" />
                {loading ? "Running OCR..." : "Extract Text"}
              </button>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Best for clear manuscript crops and high-contrast scans.
              </p>
            </div>
          </div>

          <SurfacePanel
            rounded="3xl"
            variant="subtle"
            shadow="soft"
            className="p-5"
          >
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                <Camera className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  OCR Workflow
                </h2>
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                  The uploaded image is sent to the configured OCR service and
                  returned as plain extracted text for review and reuse.
                </p>
              </div>
              {image ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-300">
                  Selected file:{" "}
                  <span className="font-semibold">{image.name}</span>
                </div>
              ) : null}
            </div>
          </SurfacePanel>
        </div>
      </SurfacePanel>

      {result ? (
        <SurfacePanel rounded="4xl" shadow="panel" className="p-6 md:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                Extracted Text
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Review the OCR output before reusing it in chat or research
                notes.
              </p>
            </div>
          </div>
          <pre className="whitespace-pre-wrap rounded-3xl border border-stone-200 bg-stone-50/80 p-5 font-coptic text-lg leading-8 text-stone-800 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-200">
            {result}
          </pre>
        </SurfacePanel>
      ) : (
        <EmptyState
          title="No OCR output yet"
          description="Upload an image and run Shenute OCR to preview extracted text here."
        />
      )}
    </PageShell>
  );
}
