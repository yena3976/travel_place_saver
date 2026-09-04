# AGENTS.md

## 1. Project Overview

This repository contains the **Reel Place Saver** project.

Reel Place Saver is a service that allows users to save an Instagram Reel URL and automatically extract place information mentioned or shown in the Reel.

The detailed product requirements are defined in:

- `docs/PRD.md`

The PRD is the primary source of truth for product requirements, features, and expected behavior.

Before implementing or modifying any feature, always review the relevant sections of the PRD.

---

## 2. Development Goal

The current goal is to build and validate the **MVP**.

Prioritize:

- Simple implementation
- Fast iteration
- Low operational cost
- Maintainable code
- Clear user flows

Avoid unnecessary complexity, infrastructure, abstractions, or premature optimization.

Do not implement features outside the PRD unless explicitly requested.

---

## 3. Before Starting a Task

Before writing or modifying code:

1. Read the relevant sections of `docs/PRD.md`.
2. Inspect the existing repository structure and implementation.
3. Identify which files and components are affected.
4. Check whether similar functionality already exists.
5. Prefer extending or reusing existing code rather than creating duplicate logic.
6. Consider whether the requested implementation affects external API or AI usage costs.

If the request conflicts with the PRD, do not silently change the product behavior.

Clearly explain the conflict and follow the user's latest explicit instruction.

---

## 4. Implementation Principles

### Keep the MVP simple

Choose the simplest implementation that satisfies the current requirements.

Avoid:

- unnecessary microservices
- unnecessary abstractions
- premature optimization
- excessive dependency introduction
- building infrastructure for hypothetical future requirements

Future extensibility is useful, but it should not significantly increase MVP complexity.

### Preserve existing behavior

When implementing a new feature:

- Do not modify unrelated functionality.
- Avoid large refactors unless necessary.
- Keep changes scoped to the requested task.
- Reuse existing patterns and components where possible.

### Make assumptions visible

If information required for implementation is not defined in the PRD or existing code:

- Make the smallest reasonable assumption.
- Clearly mention the assumption after implementation.
- Do not invent major product requirements.

Ask for clarification when an assumption would significantly affect product behavior, cost, architecture, security, or user experience.

---

## 5. AI and External API Cost Rules

AI and external API usage should be designed with cost efficiency in mind from the MVP stage.

### Reel processing

When the same Instagram Reel URL has already been processed successfully:

- Do not call AI or external APIs again unnecessarily.
- Reuse previously stored processing results whenever possible.

### AI calls

For place extraction:

- Aim for a maximum of one primary AI extraction request per Reel.
- If a Reel contains multiple places, prefer extracting all places in a single AI request.
- Avoid calling the AI model separately for each detected place unless required.

### Development and testing

During development:

- Do not make real AI/API calls when they are not required.
- Prefer mock or fixture responses for repeatable tests.
- Avoid repeated calls caused by refreshes, retries, or development loops.
- Do not introduce paid external services without a clear need.

### Usage tracking

When AI or paid external APIs are used, structure the implementation so usage can be measured.

Where practical, record information such as:

- API/provider
- operation type
- request count
- model used
- token usage when available
- estimated or actual cost when available
- success/failure status

Do not build an unnecessarily complex billing system for the MVP.

The goal is to make usage observable enough to identify unexpected cost increases.

---

## 6. Data and Processing Principles

Treat the normalized Reel URL or another stable Reel identifier as the basis for identifying duplicate processing where technically appropriate.

Processing results should be reusable so that repeated requests for the same Reel do not unnecessarily repeat expensive operations.

When processing fails:

- Do not treat failed or incomplete results as successfully cached results.
- Preserve enough information to understand the failure.
- Allow reasonable retry behavior without creating uncontrolled API loops.

---

## 7. Security and Secrets

Never commit secrets to the repository.

Examples include:

- API keys
- access tokens
- database credentials
- private service credentials

Use environment variables for secrets.

Maintain an `.env.example` file when environment variables are required.

The `.env.example` file must contain placeholder values only.

Ensure local secret files such as `.env` are excluded through `.gitignore`.

---

## 8. Error Handling

External services may fail or return incomplete information.

Handle expected failures gracefully, including:

- invalid Reel URLs
- inaccessible or deleted Reels
- Instagram-related failures
- AI extraction failures
- external API failures
- database failures

Avoid exposing raw internal errors, credentials, or sensitive implementation details to users.

Where appropriate, log enough context for debugging.

---

## 9. Testing

For important logic, add or update tests where practical.

Prioritize testing for:

- Reel URL normalization and validation
- duplicate Reel detection
- cached result reuse
- place extraction parsing
- external API failure handling
- AI response parsing

Tests should not depend on paid API calls unless explicitly required.

Use mocks or fixtures for AI and external APIs whenever possible.

---

## 10. Documentation

When implementation introduces an important technical decision that may not be obvious later, document it in:

- `docs/DECISIONS.md`

Examples:

- choosing a specific AI provider
- changing the Reel extraction approach
- introducing a new external API
- changing caching strategy
- changing the data model significantly

Do not update the PRD simply to match an implementation decision.

The PRD describes product requirements; implementation documentation describes how those requirements are fulfilled.

---

## 11. After Completing a Task

After implementation:

1. Review the changed files.
2. Run relevant tests or checks.
3. Verify that unrelated functionality was not intentionally changed.
4. Check for unnecessary AI/API calls.
5. Check that secrets or credentials were not added to the repository.

Then provide a concise summary containing:

### What changed
Describe the implemented behavior.

### Files changed
List the important files that were created or modified.

### Decisions / assumptions
Mention any meaningful implementation decisions or assumptions.

### Testing
Explain what was tested and whether tests passed.

### Remaining issues
Mention known limitations, unresolved issues, or follow-up work if applicable.

---

## 12. Source of Truth Priority

When instructions conflict, use the following priority:

1. User's latest explicit instruction
2. `docs/PRD.md`
3. `AGENTS.md`
4. Existing implementation patterns
5. Reasonable implementation assumptions

Do not silently reinterpret product requirements to match the existing code.

If the existing implementation conflicts with the PRD, identify the discrepancy before making a significant architectural or behavioral change.
