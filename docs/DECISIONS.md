# Technical decisions

## Mock-first interactive MVP

- The MVP uses an in-memory React state machine so every requested flow can be exercised without authentication, databases, or external APIs.
- Test scenarios are selected from the Add Place screen and map to deterministic mock results.
- Shared place and region fixtures live in `lib/mock-data.ts` so future API adapters can replace the data source without rewriting UI components.
- The initial implementation keeps the journey within one App Router page. Views are modeled as reusable components, avoiding premature routing and persistence complexity while preserving the complete navigation flow.
- Remote travel photography is used for realistic mock content. No image is uploaded or treated as user-owned data.
