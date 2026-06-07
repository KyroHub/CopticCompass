"use client";

import { Download, Lock } from "lucide-react";
import { useState } from "react";

import { AuthGatedActionButton } from "@/components/AuthGatedActionButton";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { cx } from "@/lib/classes";
import { getPublicErrorMessage } from "@/lib/errors";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";

import type { jsPDF as JsPdfInstance } from "jspdf";

type PdfLifecycleCallback = () => Promise<void> | void;

type DownloadPdfButtonProps = {
  targetId: string;
  fileName: string;
  beforeCapture?: PdfLifecycleCallback;
  afterCapture?: PdfLifecycleCallback;
  className?: string;
};

const PDF_BUTTON_COPY = {
  en: {
    download: "Download PDF",
    generating: "Generating...",
    loginPrompt: "Sign in or sign up to download lessons as PDF",
    footerBrand: "Coptic Compass",
    footerDescriptor: "Digital Coptology Platform",
    footerDownloadedOn: "Downloaded on",
  },
  nl: {
    download: "PDF downloaden",
    generating: "PDF wordt gemaakt...",
    loginPrompt:
      "Inloggen of een account aanmaken om lessen als pdf te downloaden",
    footerBrand: "Coptic Compass",
    footerDescriptor: "Digitaal Koptologieplatform",
    footerDownloadedOn: "Gedownload op",
  },
} as const;

/**
 * Waits for two paint cycles so layout and style changes settle before the
 * lesson content is captured into an image.
 */
function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Captures a lesson node as a high-resolution image and writes it into a
 * paginated A4 PDF after optional pre/post capture hooks run.
 */
export function DownloadPdfButton({
  targetId,
  fileName,
  beforeCapture,
  afterCapture,
  className,
}: DownloadPdfButtonProps) {
  const { language } = useLanguage();
  const authGate = useOptionalAuthGate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const copy = PDF_BUTTON_COPY[language];

  const handleDownload = async () => {
    if (!authGate.isAuthenticated) {
      return;
    }

    setPdfError(null);
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      setPdfError(getPublicErrorMessage("unexpected", language, "pdf"));
      return;
    }

    setIsGenerating(true);

    try {
      if (beforeCapture) {
        await beforeCapture();
        await waitForNextPaint();
      }

      /**
       * Load the client-only capture and PDF libraries lazily so they do not
       * inflate the initial page bundle.
       */
      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      const dataUrl = await toPng(targetElement, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;

      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = margin;

      const addProtectedMargins = (doc: JsPdfInstance) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pdfWidth, margin, "F");
        doc.rect(0, pageHeight - margin, pdfWidth, margin, "F");
      };

      /**
       * Add a branded footer after pagination so every generated page carries
       * the same Coptic Compass export signature and page count.
       */
      const addBrandedFooter = (
        doc: JsPdfInstance,
        pageNumber: number,
        totalPages: number,
      ) => {
        const now = new Date().toLocaleString(
          language === "nl" ? "nl-BE" : "en-US",
        );
        const footerY = pageHeight - margin / 2 + 2;

        doc.setDrawColor(235, 193, 125);
        doc.setLineWidth(0.3);
        doc.line(
          margin,
          pageHeight - margin + 2,
          pdfWidth - margin,
          pageHeight - margin + 2,
        );

        doc.setFontSize(9);
        doc.setTextColor(30, 29, 29);
        doc.text(copy.footerBrand, margin, footerY, { align: "left" });

        doc.setFontSize(9);
        doc.setTextColor(94, 88, 79);
        doc.text(
          `${copy.footerDescriptor} • ${copy.footerDownloadedOn} ${now}`,
          pdfWidth / 2,
          footerY,
          { align: "center" },
        );

        doc.text(`${pageNumber}/${totalPages}`, pdfWidth - margin, footerY, {
          align: "right",
        });
      };

      /**
       * Reuse the same tall capture across pages by shifting it upward until
       * the full lesson has been written into the PDF.
       */
      pdf.addImage(dataUrl, "PNG", margin, position, contentWidth, imgHeight);
      addProtectedMargins(pdf);
      heightLeft -= contentHeight;

      while (heightLeft > 0) {
        position = position - contentHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", margin, position, contentWidth, imgHeight);
        addProtectedMargins(pdf);
        heightLeft -= contentHeight;
      }

      const totalPages = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        pdf.setPage(pageNumber);
        addBrandedFooter(pdf, pageNumber, totalPages);
      }

      pdf.save(fileName);
    } catch (err: unknown) {
      console.error("PDF Generation failed", err);
      setPdfError(getPublicErrorMessage("unexpected", language, "pdf"));
    } finally {
      if (afterCapture) {
        await afterCapture();
      }

      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2">
      <AuthGatedActionButton
        className={cx(
          buttonClassName({ className, variant: "secondary" }),
          "font-semibold",
          "w-full sm:w-auto",
          isGenerating && "opacity-70",
        )}
        disabled={isGenerating}
        isAuthenticated={authGate.isAuthenticated}
        isReady={authGate.isReady}
        lockedContent={
          <>
            <Lock className="h-4 w-4" />
            {copy.download}
          </>
        }
        lockedMessage={copy.loginPrompt}
        onClick={handleDownload}
      >
        <Download
          className={`h-4 w-4 ${isGenerating ? "animate-bounce" : ""}`}
        />
        {isGenerating ? copy.generating : copy.download}
      </AuthGatedActionButton>

      {pdfError ? (
        <StatusNotice tone="error" align="left" className="text-xs">
          {pdfError}
        </StatusNotice>
      ) : null}
    </div>
  );
}
