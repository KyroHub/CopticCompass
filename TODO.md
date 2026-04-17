# AI Assistant TODO List

## Immediate Fixes

- [x] **Improve Error Handling:** Catch the 429 rate limit error in the chat interface and display a user-friendly message (e.g., "Rate limit reached, please try again later") instead of the raw JSON response payload.
- [x] **Change Default Provider:** Update the default AI provider selection in the chat component to use "Gemini" instead of "OpenRouter".

## Accuracy & Quality Improvements

- [ ] **Evaluate LLM Models:** Test different LLM versions and models to find ones that produce fewer hallucinations for our specific content.
- [x] **Refine Knowledge Base (RAG):** Experiment with different methods of chunking, storing, and retrieving the knowledge base to improve the accuracy of the context provided to the LLM.

## Deployment

- [ ] **Vercel Deployment:** Redeploy the application and monitor for any build or runtime issues.

## Growth & Access Control

- [x] **Gate Shenute to Authenticated Users (Later):** Consider making Shenute chat available only to logged-in users to incentivize account creation and improve traffic/rate control.
