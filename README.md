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

## Supabase setup

1. Supabase에서 새 프로젝트를 생성합니다. 한국 기준 권장 리전은 `Northeast Asia (Seoul)`입니다.
2. Project Settings의 API Keys 화면에서 Project URL, publishable/anon key, secret/service-role key를 확인합니다.
3. `.env.example`을 `.env.local`로 복사한 뒤 값을 입력합니다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<secret-or-service-role-key>
GOOGLE_PLACES_API_KEY=<server-restricted-google-key>
OPENAI_API_KEY=<server-only-openai-key>
OPENAI_REEL_ANALYSIS_MODEL=gpt-4.1-mini
```

`SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회할 수 있는 비밀 값입니다. 브라우저 코드나 `NEXT_PUBLIC_*` 변수에 넣지 마세요. 이 프로젝트에서는 `server-only` 모듈과 Next.js Route Handler 안에서만 사용합니다. `.env.local`은 `.gitignore`에 포함되어 Git에 올라가지 않습니다.

Supabase SQL Editor에서 아래 파일의 전체 내용을 순서대로 실행합니다.

1. `supabase/migrations/202609040001_phase2_places.sql`
2. `supabase/seed.sql` (개발 확인용, 재실행 가능)

CLI를 사용하는 경우 프로젝트를 연결한 뒤 같은 순서로 적용할 수 있습니다.

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

이 저장소의 seed는 SQL Editor에서 직접 실행하거나 Supabase CLI 로컬 환경에서 `npx supabase db reset`으로 적용합니다. 운영 데이터로 사용하지 마세요. `mock_` 접두사의 Google Place ID는 테스트 값입니다.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell에서는 복사 명령으로 `Copy-Item .env.example .env.local`을 사용할 수 있습니다. 환경 변수를 변경했다면 개발 서버를 다시 시작합니다.

## DB connection check

1. Home에서 seed 기준 `3 places across 2 regions`가 표시되는지 확인합니다.
2. Bali를 열어 Ubud과 Seminyak으로 그룹핑되는지 확인합니다.
3. Add Place에서 mock success를 저장해 duplicate 화면이 나오는지 확인합니다.
4. candidates mock에서 여러 장소를 선택해 저장하고, 신규/중복이 섞여도 신규 장소가 저장되는지 확인합니다.
5. Region Detail에서 장소를 삭제하고 Home count가 갱신되는지 확인합니다.
6. seed 없이 빈 DB로 확인할 때 Home empty state가 표시되는지 확인합니다.

API 오류는 사용자에게 일반 메시지로 표시되고, 실제 Supabase 오류는 개발 서버 로그에만 기록됩니다.

## Google Places setup

1. Google Cloud Console에서 프로젝트를 생성하거나 선택하고 Billing을 연결합니다.
2. **Places API (New)**를 활성화합니다.
3. Credentials에서 API key를 생성합니다.
4. Application restriction은 배포 환경에 맞게 서버 IP 또는 지원되는 서버 제한을 적용하고, API restriction은 **Places API (New)**만 허용하는 것을 권장합니다. 로컬 개발 중에는 제한 범위를 넓혀야 할 수 있으므로 키를 별도로 운용하세요.
5. 키를 `.env.local`의 `GOOGLE_PLACES_API_KEY`에 입력하고 개발 서버를 재시작합니다. 키는 `NEXT_PUBLIC_` 변수에 넣지 않습니다.
6. Add Place → **Search for a place manually**에서 `WYAH Ubud`처럼 3자 이상 입력합니다. 450ms 후 후보가 표시되고, 후보를 선택하면 Place Details를 거쳐 Result로 이동합니다.

검색은 Places API (New)의 Text Search와 Place Details를 서버 Route Handler에서만 호출합니다. 검색 결과는 정규화된 query 기준으로 서버 메모리에 5분간 캐시하며, 이미 DB에 같은 Google Place ID가 있으면 상세 API를 다시 호출하지 않습니다. 외부 호출은 최대 2회 시도하고 사용량 로그는 개발 서버에서 `places_usage`로 확인할 수 있습니다. 키, Google 원본 오류, 검색 원문은 로그에 남기지 않습니다.

검증 명령:

```bash
npm test
npm run build
```

## Instagram Reel analysis setup

1. `OPENAI_API_KEY`를 `.env.local`에 저장합니다. `NEXT_PUBLIC_` 접두사를 사용하지 마세요.
2. 기본 모델은 `gpt-4.1-mini`이며 `OPENAI_REEL_ANALYSIS_MODEL`로 변경할 수 있습니다.
3. Supabase SQL Editor에서 `supabase/migrations/202609080001_phase4_reel_analyses.sql`을 실행합니다.
4. 공개 Reel URL을 Add Place에 입력하면 서버가 공개 HTML의 title, caption/description, thumbnail metadata를 확보하고 OpenAI Structured Outputs로 장소를 한 번에 추출합니다.

완료 또는 장소 미검출 결과는 정규화된 Reel URL을 기준으로 DB에서 재사용합니다. 비공개·삭제·접근 제한 Reel과 분석 실패는 Manual Search로 이어지며 성공 결과로 캐시하지 않습니다. Reel 하나에서 최대 5개 장소만 Google Places로 자동 검증합니다. AI 호출은 20초 timeout, 최대 2회 시도이며 일시적 오류만 재시도합니다. 토큰과 예상 비용은 `reel_analyses`에 저장됩니다.

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
