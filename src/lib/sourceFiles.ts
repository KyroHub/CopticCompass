export type ReadableSourceType = "docx" | "image" | "pdf" | "text";

const IMAGE_MIME_PREFIX = "image/";
const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "tex",
  "log",
  "js",
  "ts",
  "tsx",
  "jsx",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "rs",
  "sql",
]);

export function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

/**
 * Classifies readable uploads by MIME type first and extension second so
 * browser-blank `File.type` values still route common source formats correctly.
 */
export function detectReadableSourceType(file: {
  name: string;
  type: string;
}): ReadableSourceType | null {
  const extension = getFileExtension(file.name);

  if (file.type === PDF_MIME || extension === "pdf") {
    return "pdf";
  }

  if (
    file.type.startsWith(IMAGE_MIME_PREFIX) ||
    IMAGE_EXTENSIONS.has(extension)
  ) {
    return "image";
  }

  if (file.type === DOCX_MIME || extension === "docx") {
    return "docx";
  }

  if (TEXT_EXTENSIONS.has(extension) || file.type.startsWith("text/")) {
    return "text";
  }

  return null;
}
