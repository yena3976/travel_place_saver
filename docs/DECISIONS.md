# Technical decisions

## Mock-first interactive MVP

- The MVP uses an in-memory React state machine so every requested flow can be exercised without authentication, databases, or external APIs.
- Test scenarios are selected from the Add Place screen and map to deterministic mock results.
- Shared place and region fixtures live in `lib/mock-data.ts` so future API adapters can replace the data source without rewriting UI components.
- The initial implementation keeps the journey within one App Router page. Views are modeled as reusable components, avoiding premature routing and persistence complexity while preserving the complete navigation flow.
- Remote travel photography is used for realistic mock content. No image is uploaded or treated as user-owned data.
- Multiple extracted places use independent selection controls and a batch save action, allowing any subset of verified candidates to be saved together.

## Phase 2 Supabase data boundary

- Client components call same-origin Route Handlers; only server modules create a Supabase client with the service-role key.
- Row-level security is enabled without anonymous policies while authentication is out of scope. All MVP writes and reads therefore pass through the trusted server boundary.
- `saved_places.normalized_reel_url` is indexed but not unique because one Reel can legitimately produce multiple saved places. Duplicate saved places are prevented by a unique constraint on `saved_places.place_id`.
- The Reel analysis result remains a fixture. Home, Region Detail, save, duplicate detection, and deletion now use the database API.

# Phase 3 — Google Places provider boundary

- Places API (New)의 Text Search로 후보를 찾고, 선택 시 Place Details를 호출한다.
- Google 응답은 `services/places`에서 내부 타입으로 변환하며 UI와 저장소에는 원본 응답을 노출하지 않는다.
- 검색 캐시는 정규화 query 기준 5분 메모리 캐시를 사용한다. MVP 트래픽에서는 DB 캐시 테이블보다 단순하며 프로세스 재시작 시 사라지는 제한을 수용한다.
- Place Details는 동일 Google Place ID가 `places`에 있으면 DB 값을 우선 재사용한다.
- Google 호출은 6초 timeout, 최대 2회 시도이며 사용자에게 provider 원본 오류를 노출하지 않는다.

# Phase 4 — Reel analysis and AI extraction

- Public Reel metadata is fetched server-side from Instagram HTML. Caption/description, title, and thumbnail metadata are used; login, private, deleted, and blocked Reels fall back to Manual Search.
- Gemini GenerateContent Structured Outputs performs at most one extraction request per uncached Reel. The default model is `gemini-3.5-flash-lite`, configurable with `GEMINI_REEL_ANALYSIS_MODEL`. This intentionally supersedes the PRD's original OpenAI provider choice following the user's Phase 4 follow-up. Gemini 2.5 Flash-Lite is not available to new API users.
- Completed and not-found results are cached in `reel_analyses` by normalized Reel URL. Failed rows may be retried and are never returned as cached successes.
- A Reel yields at most five AI place candidates. Each is passed through the existing `verifyPlace()` Google Places workflow.
- AI requests use a 20 second timeout and at most two attempts, with retry limited to transient failures. Pricing lives in `services/ai/config.ts`.
- Reel captions decode named, decimal, and hexadecimal HTML entities before extraction so Korean text from Instagram metadata remains readable.
- Cached analysis rows carry a pipeline version. Parser, prompt, or verification changes increment that version so stale results are analyzed again while current results remain reusable.
- Cross-script venue names (for example, Korean `브리끄` and Google `Brique`) may be retained as candidates when Google returns exactly one result and both city and country agree. They remain below the fully verified threshold until the user reviews them.

## Phase 4.1 — Reel video text analysis

- Public Reel HTML can contain an escaped DASH manifest even when no `og:video` tag exists. The server extracts the highest-resolution MP4 video representation and duration from that manifest; failure is non-fatal and falls back to caption-only analysis.
- Reel videos up to 25 MiB are sent inline to the existing Gemini provider. This avoids an additional storage service and remains compatible with the server runtime.
- Gemini static video processing samples at most 18 frames per Reel. Sampling uses 1 FPS for clips up to 18 seconds and an evenly reduced FPS for longer clips (the 71-second test Reel uses about 0.253 FPS). Repeated frames and non-place subtitles are ignored by the multimodal prompt.
- Caption and sampled video are analyzed together in one structured multimodal request. The output distinguishes `caption`, `video_text`, and `both`, keeps broad regions in `detectedLocation`, enriches missing venue locations from that context, and deduplicates normalized venue names before `verifyPlace()`.
- Analysis cache version 8 invalidates prior caption-only results. Usage logs distinguish combined caption/video analysis from text-only analysis and include the sampled frame count.

## Phase 4.2 — Google match safety

- Google verification now returns `verified`, `needs_confirmation`, or `not_found`. A result is verified only when its overall score is at least 0.85 and detected/Google name token similarity is at least 0.60. Results scoring at least 0.50 but missing either verified condition require confirmation; lower scores are unmatched.
- Analysis JSON retains the detected name, matched Google name, match status, and raw verification score. Unmatched vision candidates remain in the result so the user can start Manual Search with the detected name.
- Multiple-result selection defaults to verified candidates only. Confirmation candidates remain selectable after the two names are shown side by side; unmatched candidates cannot be selected. Analysis cache version 9 invalidates results that lack this safety metadata.

## Instagram regular post support

- Instagram input normalization accepts `/reel`, `/reels`, and regular `/p` URLs. Existing API routes and database column names remain unchanged for backward compatibility, while their values now represent any supported Instagram post.
- Regular image posts use the Open Graph image as a safe fallback. When embedded media JSON is available, carousel images are kept in post order and capped at six images per analysis.
- Image posts send all selected images and the caption in one Gemini structured-output request. Video posts reuse the existing DASH video sampling path. Visual download or analysis failure remains non-fatal and falls back to caption-only extraction.
- Each image is limited to 8 MiB and combined image input to 24 MiB. Analysis cache version 10 prevents older Reel-only results from masking the expanded media behavior.
