# travel_place_saver

Instagram Reel URL을 저장하면 Reel의 콘텐츠를 분석하여 **장소 정보를 자동으로 추출하고 저장할 수 있는 서비스**입니다.

맛집, 카페, 여행지 등 Instagram Reel에서 발견한 장소를 나중에 다시 찾기 쉽게 저장하는 것을 목표로 합니다.

## Project Status

🚧 MVP Development

현재 MVP 개발 단계입니다.

## Core Flow

```text
Instagram Reel URL 입력
        ↓
Reel 정보 수집
        ↓
AI 기반 장소 정보 추출
        ↓
장소 정보 확인
        ↓
장소 저장
        ↓
저장한 장소 조회
```

## Documentation

프로젝트 관련 문서는 `docs/`에서 관리합니다.

- `docs/PRD.md` — 제품 요구사항 및 기능 정의
- `docs/DECISIONS.md` — 주요 기술 및 제품 의사결정 기록
- `AGENTS.md` — AI 개발 에이전트 작업 가이드

제품 요구사항의 기준 문서는 `docs/PRD.md`입니다.

## Development

이 프로젝트는 AI coding agent를 활용하여 개발합니다.

기능을 구현하거나 수정할 때는 다음 문서를 우선 확인합니다.

1. `docs/PRD.md`
2. `AGENTS.md`
3. 기존 구현 코드

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local`에 Supabase project URL, anon key, service-role key를 입력합니다. 서비스 역할 키는 서버 Route Handler에서만 사용되며 Git에 커밋하지 않습니다.

Supabase SQL Editor에서 아래 파일을 순서대로 실행합니다.

1. `supabase/migrations/202609040001_phase2_places.sql`
2. `supabase/seed.sql`

검증 명령:

```bash
npm test
npm run build
```

## Tech Stack

- Next.js App Router / TypeScript / Tailwind CSS
- Supabase Postgres
- Next.js Route Handlers

## Repository Structure

```text
reel-place-saver/
├── README.md
├── docs/
│   ├── PRD.md
│   ├── AGENTS.md
│   └── DECISIONS.md
├── app/
├── components/
├── services/places/
├── supabase/
├── tests/
├── .env.example
└── .gitignore
```

프로젝트 구조는 실제 구현 과정에서 변경될 수 있습니다.

## Development Principles

- MVP에 필요한 기능을 우선 구현합니다.
- 불필요한 복잡성과 과도한 설계를 피합니다.
- AI/API 호출 비용을 고려하여 구현합니다.
- 동일한 Reel의 처리 결과는 가능한 한 재사용합니다.
- API Key와 같은 민감한 정보는 저장소에 커밋하지 않습니다.

## Roadmap

세부 개발 범위와 요구사항은 `docs/PRD.md`를 기준으로 관리합니다.
