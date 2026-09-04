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
