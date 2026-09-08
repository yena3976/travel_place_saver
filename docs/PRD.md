# Instagram Reel Place Saver

## Mobile Web MVP 기획 및 구현 명세

---

# 1. 서비스 개요

Instagram 릴스에서 발견한 여행 장소를 링크 하나로 저장하고, 지역별로 모아볼 수 있는 모바일 웹 서비스.

사용자가 Instagram Reel URL을 입력하면 릴스에서 장소와 지역 정보를 추출하고, 실제 장소인지 검증한 뒤 저장한다.

저장된 장소는 지역별로 확인할 수 있으며, 각 장소에서 원본 Instagram Reel과 Google Maps로 이동할 수 있다.

### 한 줄 정의

**릴스 링크만 넣으면 가고 싶은 장소를 찾아 지역별로 정리해주는 여행 장소 저장함.**

---

# 2. 문제 정의

Instagram에서 여행 장소를 발견해도 이후 다시 활용하려면 여러 단계가 필요하다.

현재 사용 흐름은 보통 다음과 같다.

```text
릴스 발견
→ Instagram 저장 또는 DM 공유
→ 나중에 저장 목록에서 다시 찾기
→ 장소명 확인
→ Google Maps에서 다시 검색
```

이 과정에서 다음 문제가 발생한다.

- 저장한 릴스가 쌓여 원하는 장소를 다시 찾기 어렵다.
- 여행지별로 장소가 정리되지 않는다.
- 실제 방문하려면 Google Maps에서 장소를 다시 검색해야 한다.
- 릴스와 실제 장소 정보가 분리되어 관리된다.

---

# 3. 목표

사용자가 해야 하는 행동을 최대한 단순화한다.

```text
릴스 링크 붙여넣기
→ 장소 확인
→ 저장
```

### MVP 핵심 목표

1. Instagram Reel 또는 일반 Post URL에서 장소 후보를 추출한다.
2. 실제 존재하는 장소인지 외부 장소 데이터로 검증한다.
3. 장소의 국가·도시·세부지역 정보를 구조화한다.
4. 저장 장소를 지역별로 한눈에 확인할 수 있게 한다.
5. 원본 Instagram Reel과 Google Maps로 바로 이동할 수 있게 한다.

---

# 4. 플랫폼

### Mobile First

초기 서비스는 **모바일 웹**으로 구현한다.

주요 사용 환경:

- iOS Safari
- Android Chrome
- 모바일 Chrome
- 데스크톱은 반응형 최소 대응

별도 네이티브 앱은 MVP 범위에서 제외한다.

---

# 5. MVP 범위

## 포함

- Instagram Reel / 일반 Post URL 입력
- Instagram 게시물 콘텐츠 분석
- 장소명 후보 추출
- 지역 정보 추출
- 장소 카테고리 추출
- 외부 Place 데이터 기반 장소 검증
- 장소 저장
- 중복 장소 확인
- 지역별 장소 목록
- 원본 Instagram Reel 연결
- Google Maps 연결
- 장소 삭제
- 장소 미검출 시 직접 검색

## 제외

- Instagram 계정 연동
- DM 자동 수집
- 친구 초대 / 공동 리스트
- 앱 내부 지도
- 여행 일정 생성
- AI 여행 추천
- 리뷰 / 댓글 / 좋아요
- Trip 단위 관리
- 소셜 기능
- 네이티브 공유 Extension

---

# 6. 핵심 사용자 플로우

```text
Instagram에서 Reel 발견
↓
Reel URL 복사
↓
서비스 접속
↓
URL 붙여넣기
↓
Reel 분석
↓
장소 후보 추출
↓
장소 검증
↓
사용자 최종 확인
↓
저장
↓
지역별 장소 목록
↓
Google Maps 또는 Instagram 이동
```

AI의 confidence가 높더라도 MVP에서는 **자동 저장하지 않고 사용자가 최종 확인 후 저장**한다.

---

# 7. IA

```text
Home
│
├─ Add Place
│   ├─ URL Input
│   ├─ Analyzing
│   ├─ Result
│   │   ├─ Single Place
│   │   ├─ Multiple Candidates
│   │   ├─ Multiple Places
│   │   ├─ Duplicate
│   │   └─ No Place Found
│   └─ Manual Search
│
└─ Region Detail
    └─ Place Card
        ├─ Instagram Reel
        ├─ Google Maps
        └─ Delete
```

MVP에서는 별도 Place Detail 화면과 Bottom Navigation을 두지 않는다.

---

# 8. 화면 및 기능 정의

## 8.1 Home

### 목적

저장한 장소를 여행 지역별로 확인하고 새로운 장소를 추가한다.

### 주요 정보

- 전체 저장 장소 수
- 지역명
- 국가명
- 지역별 저장 장소 수
- 장소 추가 버튼

### 예시

```text
Places

28 places saved

Bali
Indonesia · 12 places        >

Tokyo
Japan · 8 places             >

Bangkok
Thailand · 5 places          >

                            +
```

### 기능

| 기능      | 동작                |
| --------- | ------------------- |
| 지역 선택 | Region Detail 이동  |
| + 버튼    | Add Place 이동      |
| Reload    | 최신 저장 목록 조회 |

### 상태

- Loading
- Empty
- Has Places
- Error

### Empty State

```text
아직 저장한 장소가 없어요.

Instagram에서 가고 싶은 장소를 발견하면
Reel 링크를 붙여넣어보세요.

[ Add your first place ]
```

---

## 8.2 Add Place

### 목적

Instagram Reel URL을 입력한다.

### 주요 요소

- Reel URL 입력창
- 붙여넣기 버튼
- Analyze 버튼

### 기능

| 기능     | 동작                  |
| -------- | --------------------- |
| URL 입력 | Reel URL 저장         |
| 붙여넣기 | Clipboard URL 입력    |
| Analyze  | URL 검증 후 분석 시작 |

### 상태

| 상태           | 처리                |
| -------------- | ------------------- |
| Default        | 입력창 노출         |
| URL Entered    | Analyze 활성화      |
| Invalid URL    | 인라인 오류         |
| Loading        | Analyzing 화면 이동 |
| Access Error   | Reel 접근 실패 안내 |
| Analysis Error | 재시도 제공         |

---

## 8.3 Analyzing

### 목적

장소 분석이 진행 중임을 사용자에게 알린다.

### 노출 예시

```text
Finding this place...

Reel에서 장소를 찾고 있어요.
```

### 내부 처리

```text
Reel 정보 조회
↓
장소 후보 추출
↓
지역 정보 추출
↓
Place 검색
↓
장소 검증
```

---

## 8.4 Result — Single Place

### 조건

장소 하나가 높은 정확도로 검증된 경우.

### 주요 정보

- Reel Thumbnail
- 장소명
- 카테고리
- Area
- City
- Country
- 검증 상태
- Instagram 링크
- Google Maps 링크

### 기능

| 기능           | 동작                |
| -------------- | ------------------- |
| Instagram Reel | 원본 Reel 이동      |
| Google Maps    | 해당 장소 Maps 이동 |
| Save Place     | 장소 저장           |
| Back           | Add Place 복귀      |

저장 완료 후 해당 Region Detail 화면으로 이동한다.

---

## 8.5 Result — Multiple Candidates

### 조건

장소 후보가 여러 개이며 하나로 확정하기 어려운 경우.

### 기능

- 후보를 하나 이상 선택 / 해제
- 검증된 후보는 복수 선택 가능
- 선택한 장소를 한 번에 저장
- None 선택 시 Manual Search 이동

모바일에서는 Bottom Sheet 형태 사용 가능.

---

## 8.6 Result — Multiple Places

### 조건

하나의 Reel에 여러 장소가 포함된 경우.

### 기능

- 장소별 선택 / 해제
- 검증된 장소만 저장 가능
- 선택한 장소 일괄 저장

---

## 8.7 Duplicate

### 조건

동일 Google Place ID가 이미 저장되어 있는 경우.

### 처리

- 새로운 Place 레코드는 생성하지 않는다.
- 기존 저장 장소로 이동 가능
- 동일 장소에 여러 Reel을 저장하는 기능은 MVP 이후 검토한다.

---

## 8.8 No Place Found

### 조건

Reel에서 정확한 장소를 특정하지 못한 경우.

### 기능

- Manual Search 이동
- Add Place 재시도

---

## 8.9 Manual Search

### 목적

자동 추출에 실패했을 경우 직접 장소를 검색한다.

### 기능

- 장소명 입력
- Google Places 기반 검색 결과 노출
- 결과 선택
- 선택 후 Single Result 화면 이동

---

## 8.10 Region Detail

### 목적

특정 여행지역에 저장된 장소를 한눈에 확인한다.

### 그룹핑

```text
City / 대표 지역
↓
Area
↓
Place
```

화면에서는 필요 이상으로 행정구역 체계를 노출하지 않는다.

예:

```text
Bali

Ubud
- Place A
- Place B

Seminyak
- Place C
```

### 기능

| 기능      | 동작              |
| --------- | ----------------- |
| Instagram | 원본 Reel 이동    |
| Maps      | Google Maps 이동  |
| ⋯         | Place Action Menu |
| Delete    | 장소 삭제         |
| Back      | Home 이동         |

### 상태

- Loading
- Has Places
- Empty
- Error

---

# 9. Place Card

### 표시 정보

- Thumbnail
- 장소명
- 카테고리
- Area
- Instagram 링크
- Google Maps 링크
- More 메뉴

삭제 기능은 카드에 직접 노출하지 않고 More 메뉴 안에 둔다.

---

# 10. 장소 분석 및 검증 로직

## Step 1. Reel 정보 수집

가능한 정보 소스를 분석한다.

우선순위:

1. Reel Caption
2. Reel 내 텍스트
3. 영상 프레임
4. 영상 음성

추출 대상:

- 장소명
- 국가
- 도시
- 지역
- 카테고리

## Step 2. 장소 후보 생성

예:

```json
{
  "placeCandidate": "WYAH Art & Creative Space",
  "countryCandidate": "Indonesia",
  "cityCandidate": "Bali",
  "areaCandidate": "Ubud",
  "category": "Cafe"
}
```

## Step 3. 외부 장소 데이터 검증

AI 추출 결과를 그대로 저장하지 않는다.

외부 Place 데이터에서 다음 정보를 확보한다.

- 공식 장소명
- 주소
- Country
- City
- Area
- Latitude
- Longitude
- Google Place ID
- Google Maps URL
- 영업 상태

---

# 11. Confidence 정책

| Confidence           | 처리                           |
| -------------------- | ------------------------------ |
| 0.85 이상            | 단일 장소 Result               |
| 0.5 이상 ~ 0.85 미만 | 복수 후보 제시                 |
| 0.5 미만             | No Place Found / Manual Search |

모든 경우 최종 저장은 사용자가 직접 실행한다.

---

# 12. 중복 정책

중복 판단 기준:

```text
Google Place ID
```

동일 Place ID가 이미 존재하면 중복으로 처리한다.

MVP에서는 한 장소당 하나의 Reel만 저장한다.

---

# 13. DB 구조

## 13.1 places

장소 자체의 정규화된 정보.

```sql
places

id                  uuid primary key
name                text not null
category            text
country             text
country_code        text
city                text
area                text
address             text

latitude            numeric
longitude           numeric

google_place_id     text unique
google_maps_url     text

status              text
created_at          timestamp
updated_at          timestamp
```

`status`

```text
open
temporarily_closed
permanently_closed
unknown
```

## 13.2 saved_places

사용자가 어떤 Reel을 보고 해당 장소를 저장했는지에 대한 정보.

```sql
saved_places

id                    uuid primary key
place_id              uuid references places(id)

instagram_reel_url    text not null
instagram_thumbnail   text

source_title          text
source_caption        text

confidence            numeric

created_at            timestamp
```

MVP에서는 동일 장소 중복 저장을 막기 위해 `saved_places.place_id`에 unique constraint를 둘 수 있다.

---

# 14. 지역 데이터 처리

별도 `regions` 테이블은 만들지 않는다.

Home에서는 저장 장소를 city + country 기준으로 그룹핑해 지역 목록을 생성한다.

Region Detail에서는 선택한 region의 장소를 조회한 뒤 `area`로 그룹핑한다.

---

# 15. API 구조

```text
POST   /api/reels/analyze
POST   /api/places/save

GET    /api/regions
GET    /api/regions/:region

GET    /api/places/search
DELETE /api/places/:id
```

---

# 16. API 상세

## 16.1 POST /api/reels/analyze

### Request

```json
{
  "url": "https://www.instagram.com/reel/XXXXX/"
}
```

### 단일 장소 Response

```json
{
  "status": "single",
  "reel": {
    "url": "https://www.instagram.com/reel/XXXXX/",
    "thumbnailUrl": "https://..."
  },
  "result": {
    "placeName": "WYAH Art & Creative Space",
    "category": "Cafe",
    "country": "Indonesia",
    "city": "Bali",
    "area": "Ubud",
    "confidence": 0.94,
    "verified": true,
    "google": {
      "placeId": "xxxxx",
      "address": "...",
      "mapsUrl": "...",
      "latitude": -8.5,
      "longitude": 115.2,
      "status": "open"
    }
  }
}
```

### 가능한 status

```text
single
candidates
multiple
not_found
error
```

### 내부 처리

```text
URL validation
↓
Reel metadata 접근
↓
Caption / 텍스트 정보 확보
↓
필요 시 영상 / 프레임 / 음성 분석
↓
장소 후보 추출
↓
Google Places 검색
↓
후보 매칭
↓
confidence 계산
↓
Response 반환
```

---

## 16.2 POST /api/places/save

단일 장소 또는 사용자가 선택한 복수의 검증된 장소를 저장한다. 복수 저장 요청은 각 장소를 동일한 중복 검사 규칙으로 독립 처리하며, 전체 요청은 한 번의 사용자 동작으로 실행한다.

### 처리

```text
google_place_id 조회
↓
places 존재 여부 확인
↓
없으면 place 생성
↓
saved_places 중복 확인
↓
중복 아니면 저장
```

### Response

```json
{
  "status": "saved",
  "region": "Bali"
}
```

중복:

```json
{
  "status": "duplicate",
  "savedPlaceId": "..."
}
```

복수 저장 시에는 입력 순서대로 각 장소의 `saved` 또는 `duplicate` 결과를 반환한다. 일부 장소가 중복이어도 나머지 장소의 저장은 계속 처리한다.

---

## 16.3 GET /api/regions

Home용.

```json
{
  "total": 28,
  "regions": [
    {
      "region": "Bali",
      "country": "Indonesia",
      "count": 12
    },
    {
      "region": "Tokyo",
      "country": "Japan",
      "count": 8
    }
  ]
}
```

---

## 16.4 GET /api/regions/:region

Region Detail용.

```json
{
  "region": "Bali",
  "country": "Indonesia",
  "count": 12,
  "areas": [
    {
      "name": "Ubud",
      "places": [
        {
          "id": "...",
          "name": "WYAH Art & Creative Space",
          "category": "Cafe",
          "thumbnailUrl": "...",
          "instagramUrl": "...",
          "googleMapsUrl": "..."
        }
      ]
    }
  ]
}
```

---

## 16.5 GET /api/places/search

Manual Search용.

```text
GET /api/places/search?q=wyah
```

Google Places 기반 검색 결과를 반환한다.

---

## 16.6 DELETE /api/places/:id

saved place를 삭제한다.

MVP에서는 saved_places만 삭제하고 places 레코드는 유지해도 무방하다.

---

# 17. AI 구조화 응답

LLM 응답은 자유 텍스트가 아닌 구조화된 JSON으로 제한한다.

예:

```json
{
  "places": [
    {
      "name": "WYAH Art & Creative Space",
      "country": "Indonesia",
      "city": "Bali",
      "area": "Ubud",
      "category": "Cafe",
      "confidence": 0.91
    }
  ]
}
```

장소가 없으면:

```json
{
  "places": [],
  "detectedLocation": {
    "country": "Indonesia",
    "city": "Bali",
    "area": "Ubud"
  }
}
```

---

# 18. Google Places 검증

장소 후보 검색 예:

```text
WYAH Art & Creative Space Ubud Bali
```

초기 MVP에서는 복잡한 모델 대신 단순 weighted score를 사용한다.

예:

```text
Final confidence

AI confidence      40%
Name match         35%
Location match     25%
```

---

# 19. 장소 카테고리

- Restaurant
- Cafe
- Bar
- Hotel
- Attraction
- Shopping
- Activity
- Nature
- Other

---

# 20. 주요 예외 케이스

## 하나의 Reel에 여러 장소

검증 가능한 모든 장소 후보를 제공하고 사용자가 저장 대상을 선택한다.

## 장소명 없이 지역만 확인된 경우

자동 저장하지 않고 Manual Search로 연결한다.

## 동일 이름 장소가 여러 지역에 존재

Reel에서 추출한 국가 / 도시 / 지역 정보를 활용해 후보 순위를 정한다.

## 폐업 장소

폐업 상태를 노출하고 사용자 확인 후 저장 가능하게 한다.

## Reel 접근 불가

비공개 계정, 삭제 콘텐츠, 접근 제한 등의 오류 상태를 제공한다.

---

# 21. 모바일 UX 원칙

1. 기본 사용자 입력은 Reel URL 하나로 제한한다.
2. 한 화면에 하나의 Primary CTA를 둔다.
3. Analyze, Save, Confirm 등 주요 버튼은 하단에 배치한다.
4. 잘못된 자동 저장보다 사용자 확인을 우선한다.
5. MVP에서는 자체 지도보다 Instagram / Google Maps 외부 연결을 우선한다.
6. 저장 이유를 다시 확인할 수 있도록 원본 Reel 링크와 Thumbnail을 보관한다.
7. Home은 Floating Add Button 구조를 사용하고 Bottom Navigation은 사용하지 않는다.

---

# 22. 프론트 구조

Next.js App Router 기준.

```text
/app

/page.tsx
/add/page.tsx
/add/analyzing/page.tsx
/add/result/page.tsx
/region/[region]/page.tsx
```

### Components

```text
/components

RegionCard
PlaceCard
PlaceResultCard
CandidateList
ManualSearch
BottomCTA
LoadingState
EmptyState
ErrorState
```

---

# 23. 기술 스택

```text
Frontend
Next.js
TypeScript
Tailwind CSS

Backend
Next.js Route Handler

DB
Supabase Postgres

AI
OpenAI API

Place Verification
Google Places API

Deploy
Vercel
```

---

# 24. 환경 변수

```text
OPENAI_API_KEY=

GOOGLE_PLACES_API_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Instagram 접근 방식 확정 후 관련 환경 변수를 추가한다.

---

# 25. AI/API 비용 제어 및 사용량 계측

MVP 단계부터 외부 API 비용을 추적하고 통제할 수 있도록 아래 기준을 반영한다.

### 25.1 동일 Reel 재사용

- 동일한 Instagram Reel URL에 대해 기존 처리 결과가 존재하면 AI/API를 재호출하지 않고 저장된 결과를 재사용한다.
- 비교 시 URL 파라미터 차이 등으로 동일 Reel이 중복 처리되지 않도록 정규화된 Reel URL을 기준으로 식별할 수 있게 설계한다.

### 25.2 AI 호출 최소화

- 장소 추출을 위한 AI 호출은 가능한 한 **Reel 1건당 1회**로 제한한다.
- 하나의 Reel에 여러 장소가 포함된 경우 장소별로 AI를 반복 호출하지 않고, 한 번의 응답에서 모든 장소를 구조화해 반환한다.
- 추가 호출이 필요한 경우 명확한 실패 또는 정보 부족 조건에서만 수행하도록 한다.

### 25.3 AI 서비스 모듈 분리

AI 호출 로직은 화면이나 개별 API Route에 직접 결합하지 않고 공통 서비스 모듈로 분리한다.

예:

```text
/services/ai/
  analyzeReel.ts
  types.ts
```

이를 통해 향후 아래 변경이 가능하도록 한다.

- AI 모델 교체
- AI Provider 교체
- Prompt 변경
- 모델별 비용 정책 변경
- 호출 제한 정책 변경

### 25.4 AI 사용량 로그

각 AI 요청에 대해 최소 다음 정보를 기록할 수 있도록 구조를 설계한다.

- 사용 모델
- Input Token
- Output Token
- 요청 성공 / 실패 여부
- 처리 시간
- 가능할 경우 추정 API 비용
- 요청 시각

초기 목적은 과금 기능 구현이 아니라 **실제 Reel 1건 처리에 어느 정도 비용이 발생하는지 측정하는 것**이다.

### 25.5 Google Places 결과 재사용

Google Places API 역시 동일 장소나 동일 검색어에 대해 불필요한 반복 요청이 발생하지 않도록 한다.

- 정규화된 검색어 기준 캐시 또는 DB 저장 구조 고려
- Google Place ID를 확보한 장소는 기존 저장 데이터를 우선 사용
- 장소 검증 로직은 UI와 분리된 공통 서비스로 관리

예:

```text
/services/places/
  searchPlaces.ts
  verifyPlace.ts
  types.ts
```

### 25.6 외부 API 재시도 제한

외부 API 실패 시 무한 재시도가 발생하지 않도록 한다.

- API별 최대 재시도 횟수를 명시적으로 제한한다.
- 최종 실패 시 Error / Manual Search 등 서비스 내 정상적인 실패 상태로 반환한다.
- 사용자가 필요한 경우 직접 재시도할 수 있게 한다.

### 25.7 향후 사용자별 사용량 제한

향후 사용자별로 아래 정책을 적용할 수 있도록 확장 가능한 구조로 설계한다.

- 일일 Reel 분석 건수 제한
- 월간 Reel 분석 건수 제한
- 사용자별 AI 사용량 측정
- 요금제별 처리 가능 건수 차등

MVP에서는 인증·과금·Quota 시스템을 구현하지 않는다.

### 25.8 MVP 비용 관리 목표

MVP 단계에서는 복잡한 과금 시스템보다 아래 과정을 확인하는 것을 목표로 한다.

```text
실제 사용량 측정
↓
Reel 1건당 평균 비용 계산
↓
비용이 많이 발생하는 단계 파악
↓
캐시 / 모델 / 호출 구조 최적화
```

비용 최적화 우선순위는 다음과 같다.

1. 기존 결과 재사용
2. Reel 1건당 AI 호출 최소화
3. 여러 장소를 한 번의 AI 응답으로 처리
4. 검증된 Google Places 데이터 재사용
5. 외부 API 재시도 횟수 제한
6. 모델 및 Provider 교체가 가능한 구조 유지

---

# 26. 성공 기준

### Place Extraction Success Rate

Reel 분석 후 하나 이상의 장소 후보를 제공한 비율.

목표: **80% 이상**

### Place Verification Rate

추출한 장소가 외부 Place 데이터와 매칭되는 비율.

목표: **90% 이상**

### Manual Correction Rate

사용자가 자동 분석 결과를 다른 장소로 수정한 비율.

목표: **20% 이하**

### Save Completion Rate

분석을 시작한 사용자 중 최종 저장까지 완료한 비율.

---

# 27. MVP 완료 기준

다음 흐름이 모바일 웹에서 정상 동작하면 V0.1 완료로 정의한다.

```text
Reel URL 입력
↓
장소 분석
↓
장소 검증
↓
사용자 확인
↓
저장
↓
지역별 목록 조회
↓
Instagram / Google Maps 이동
```

추가 기능보다 핵심 흐름의 안정성과 장소 정확도를 우선한다.

---
