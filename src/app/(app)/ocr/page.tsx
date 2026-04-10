"use client";

import { useState } from "react";
import { processOCRImage } from "@/actions/ocrActions";

export default function OCRPage() {
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setImage(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      const formData = new FormData();
      formData.append("file", image);

      const res = await processOCRImage(formData);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process OCR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-5">
      <h1 className="text-3xl font-bold mb-4">Shenute OCR Extractor</h1>
      <p className="text-muted-foreground mb-6">
        Upload an image of Coptic text to extract its contents for analysis.
      </p>

      <div className="flex flex-col gap-4 border rounded-xl p-6 shadow-sm">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold"
        />
        <button
          onClick={handleUpload}
          disabled={!image || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? "Processing via OCR Service..." : "Extract Text"}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 border rounded-lg p-6 bg-slate-50">
          <h2 className="text-xl border-b pb-2 mb-4 font-semibold">
            Extracted Text:
          </h2>
          <pre className="whitespace-pre-wrap font-sanscoptic text-lg">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
