import { buttonClassName } from "@/components/Button";
import { SurfacePanel, surfacePanelClassName } from "@/components/SurfacePanel";
import {
  toAdminRagEmbeddingProvider,
  type AdminRagEmbeddingProvider,
} from "@/lib/admin/ragRequestPayload";

import type { AdminRagIngestionCopy } from "./adminRagIngestionCopy";
import type { Dispatch, SetStateAction } from "react";

export function AdminRagIngestionControls({
  bulkJsonPending,
  copy,
  embeddingProvider,
  handleIngestJsonSources,
  isPending,
  setEmbeddingProvider,
}: {
  bulkJsonPending: boolean;
  copy: AdminRagIngestionCopy;
  embeddingProvider: AdminRagEmbeddingProvider;
  handleIngestJsonSources: () => Promise<void>;
  isPending: boolean;
  setEmbeddingProvider: Dispatch<SetStateAction<AdminRagEmbeddingProvider>>;
}) {
  return (
    <SurfacePanel rounded="lg" variant="subtle" shadow="soft" className="p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            {copy.sourceLabel}
          </span>
          <input
            name="source_title"
            type="text"
            placeholder="Comprehensive Lexicon Volume 2"
            className="input-base text-sm"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink">
            {copy.knowledgeFile}
          </span>
          <input
            name="file"
            type="file"
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv,application/json,text/xml,text/html,image/*,.pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.html,.htm,.yaml,.yml"
            required
            className="input-base h-auto py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-accent-strong"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={surfacePanelClassName({
              shadow: "soft",
              className: "checkbox-row",
            })}
          >
            <input
              name="enable_ocr"
              type="checkbox"
              defaultChecked
              className="checkbox-base"
            />
            <span className="text-sm leading-6 text-muted">{copy.runOcr}</span>
          </label>

          <label
            className={surfacePanelClassName({
              shadow: "soft",
              className: "checkbox-row",
            })}
          >
            <input name="force_ocr" type="checkbox" className="checkbox-base" />
            <span className="text-sm leading-6 text-muted">
              {copy.forceOcr}
            </span>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm text-muted">
          <span className="font-semibold text-ink">
            {copy.embeddingProvider}
          </span>
          <select
            name="embedding_provider"
            value={embeddingProvider}
            onChange={(event) => {
              setEmbeddingProvider(
                toAdminRagEmbeddingProvider(event.target.value),
              );
            }}
            className="compact-select-base"
          >
            <option value="hf">Hugging Face</option>
            <option value="gemini">Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={buttonClassName({ className: "px-6" })}
        >
          {isPending ? copy.fileIngesting : copy.fileIngest}
        </button>
        <button
          type="button"
          disabled={bulkJsonPending}
          onClick={() => {
            void handleIngestJsonSources();
          }}
          className={buttonClassName({
            className: "px-6",
            variant: "secondary",
          })}
        >
          {bulkJsonPending ? copy.bulkIngesting : copy.bulkIngest}
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs leading-5 text-muted md:grid-cols-2">
        <p>{copy.supports}</p>
        <p>{copy.defaultChunkProfile}</p>
      </div>
    </SurfacePanel>
  );
}
