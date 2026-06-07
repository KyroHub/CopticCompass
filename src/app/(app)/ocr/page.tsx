"use client";

import { Camera, FileText, ScanSearch } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { processOCRImage } from "@/actions/ocrActions";
import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { PageHeader } from "@/components/PageHeader";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import { getLocalizedHomePath } from "@/lib/locale";
import { getPublicOcrErrorMessage } from "@/lib/ocrErrors";

const OCR_COPY = {
  en: {
    bestFor: "Best for clear manuscript crops and high-contrast scans.",
    description:
      "Upload a manuscript photo or scanned page and extract text into a reusable reading surface.",
    emptyDescription:
      "Upload an image and run Shenute OCR to preview extracted text here.",
    emptyTitle: "No OCR output yet",
    extract: "Extract Text",
    extractedDescription:
      "Review the OCR output before reusing it in Shenute AI or research notes.",
    extractedTitle: "Extracted Text",
    fallbackError: "Failed to process OCR.",
    imageLabel: "Knowledge image",
    running: "Running OCR...",
    selectedFile: "Selected file:",
    title: "Shenute OCR",
    workflowDescription:
      "The uploaded image is sent to the configured OCR service and returned as plain extracted text for review and reuse.",
    workflowTitle: "OCR Workflow",
  },
  nl: {
    bestFor:
      "Werkt het best met duidelijke manuscriptuitsneden en scans met hoog contrast.",
    description:
      "Upload een manuscriptfoto of gescande pagina en haal de tekst eruit voor hergebruik in uw studieomgeving.",
    emptyDescription:
      "Upload een afbeelding en voer Shenute OCR uit om de herkende tekst hier te bekijken.",
    emptyTitle: "Nog geen OCR-uitvoer",
    extract: "Tekst herkennen",
    extractedDescription:
      "Controleer de OCR-uitvoer voordat u die opnieuw gebruikt in Shenute AI of onderzoeksnotities.",
    extractedTitle: "Herkende tekst",
    fallbackError: "OCR-verwerking is mislukt.",
    imageLabel: "Kennisafbeelding",
    running: "OCR uitvoeren...",
    selectedFile: "Geselecteerd bestand:",
    title: "Shenute OCR",
    workflowDescription:
      "De geuploade afbeelding wordt naar de geconfigureerde OCR-service gestuurd en komt terug als platte herkende tekst voor controle en hergebruik.",
    workflowTitle: "OCR-workflow",
  },
} as const;

/**
 * Provides a lightweight OCR workspace for testing Coptic image extraction
 * without leaving the shared app shell and form styling behind.
 */
export default function OCRPage() {
  const { language, t } = useLanguage();
  const copy = OCR_COPY[language];
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
      setError(getPublicOcrErrorMessage(processingError, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content mx-auto max-w-4xl"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <AppPageIntro
        align="left"
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: copy.title },
        ]}
        title={copy.title}
        description={copy.description}
        tone="coptic"
      />

      <div className="space-y-8">
        <SurfacePanel rounded="lg" shadow="panel" className="p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)]">
            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-ink">
                  {copy.imageLabel}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="input-base h-auto py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent-strong dark:file:bg-accent-soft dark:file:text-accent"
                />
              </label>

              {error ? (
                <StatusNotice tone="error" align="left">
                  {error}
                </StatusNotice>
              ) : null}

              <div className="grid w-full gap-3 sm:flex sm:w-auto sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    void handleUpload();
                  }}
                  disabled={!image || loading}
                  className={buttonClassName({
                    className: "w-full px-5 sm:w-auto",
                  })}
                >
                  <ScanSearch className="h-4 w-4" />
                  {loading ? copy.running : copy.extract}
                </button>
                <p className="text-sm text-muted">{copy.bestFor}</p>
              </div>
            </div>

            <SurfacePanel
              rounded="lg"
              variant="subtle"
              shadow="soft"
              className="p-5"
            >
              <div className="space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-coptic-soft text-coptic">
                  <Camera className="h-5 w-5" />
                </div>
                <PageHeader
                  as="h2"
                  align="left"
                  size="section"
                  title={copy.workflowTitle}
                  description={copy.workflowDescription}
                />
                {image ? (
                  <div
                    className={surfacePanelClassName({
                      rounded: "lg",
                      variant: "elevated",
                      className: "px-4 py-3 text-sm text-muted",
                    })}
                  >
                    {copy.selectedFile}{" "}
                    <span className="font-semibold">{image.name}</span>
                  </div>
                ) : null}
              </div>
            </SurfacePanel>
          </div>
        </SurfacePanel>

        {result ? (
          <SurfacePanel rounded="lg" shadow="panel" className="p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-coptic-soft text-coptic">
                <FileText className="h-5 w-5" />
              </div>
              <PageHeader
                as="h2"
                align="left"
                size="section"
                title={copy.extractedTitle}
                description={copy.extractedDescription}
              />
            </div>
            <pre
              className={surfacePanelClassName({
                rounded: "lg",
                variant: "elevated",
                className:
                  "whitespace-pre-wrap p-5 font-coptic text-lg leading-8 text-ink",
              })}
            >
              {result}
            </pre>
          </SurfacePanel>
        ) : (
          <EmptyState
            title={copy.emptyTitle}
            description={copy.emptyDescription}
          />
        )}
      </div>
    </PageShell>
  );
}
