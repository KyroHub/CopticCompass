# AI Assistant TODO List

## Immediate Fixes

- [x] **Improve Error Handling:** Catch the 429 rate limit error in the chat interface and display a user-friendly message (e.g., "Rate limit reached, please try again later") instead of the raw JSON response payload.
- [x] **Change Default Provider:** Update the default AI provider selection in the chat component to use "Gemini" instead of "OpenRouter".

## Accuracy & Quality Improvements

- [ ] **Evaluate LLM Models:** Test different LLM versions and models to find ones that produce fewer hallucinations for our specific content.
- [ ] **Refine Knowledge Base (RAG):** Experiment with different methods of chunking, storing, and retrieving the knowledge base to improve the accuracy of the context provided to the LLM.
- [ ] **PDF Ingestion Architecture:** Ingest PDF books using OCR and LLM reconciliation to produce structured JSON/XML files for storage (similar to the current dictionary logic) with structured metadata for the pdf content for each chunk.
- [ ] **Grammar Context Injection:** Transition grammar rules fully out of retrieval-based (RAG) search and inject them directly into the LLM context/system prompt instead.
- [x] **Try to fetch vocabulary using metadata before using vector search:** 

- [x] **Try to get the keywords of a prompt in english and german to look them up using vector search because the Coptic Lexicon is in German and the dictionary is in English:** 

- [x] **Try to reason about the user prompt to understand the structure of the sentence then try to look up the grammtical lessons from the grammer lesson from JSON or metadata from ingested grammer PDFs that matches the structure of the sentence using vector search:** 


- [x] **try to extract metadata from Grammer PDFs and try to repharse each sentence using LLMs and OCR to express the gramatical rules from the PDF:** 


## Deployment

- [ ] **Vercel Deployment:** Redeploy the application and monitor for any build or runtime issues.

## Growth & Access Control

- [x] **Gate Shenute to Authenticated Users (Later):** Consider making Shenute chat available only to logged-in users to incentivize account creation and improve traffic/rate control.
