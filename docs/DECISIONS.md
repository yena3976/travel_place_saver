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
- OpenAI Responses API Structured Outputs performs at most one extraction request per uncached Reel. The default model is `gpt-4.1-mini`, configurable with `OPENAI_REEL_ANALYSIS_MODEL`.
- Completed and not-found results are cached in `reel_analyses` by normalized Reel URL. Failed rows may be retried and are never returned as cached successes.
- A Reel yields at most five AI place candidates. Each is passed through the existing `verifyPlace()` Google Places workflow.
- AI requests use a 20 second timeout and at most two attempts, with retry limited to transient failures. Pricing lives in `services/ai/config.ts`.
