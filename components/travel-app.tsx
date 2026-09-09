'use client';

/* oxlint-disable next/no-img-element, react/react-compiler -- Remote thumbnails use original URLs; async load effects intentionally manage request state. */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Clipboard,
  Clapperboard as Instagram,
  ExternalLink,
  LoaderCircle,
  Map,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { featuredPlace } from '@/lib/mock-data';
import {
  defaultSelectedResultIds,
  resultPlaceId,
} from '@/lib/result-selection';
import type { ReelAnalysisResult } from '@/services/ai/types';
import type {
  PlaceInput,
  PlaceSearchResult,
  RegionSummary,
  SavedPlaceView,
  VerifiedPlace,
} from '@/services/places/types';

type Screen =
  | 'home'
  | 'add'
  | 'analyzing'
  | 'result'
  | 'duplicate'
  | 'not-found'
  | 'analysis-error'
  | 'candidates'
  | 'manual-search'
  | 'region';
type LoadState = 'loading' | 'ready' | 'error';
type ResultPlace = PlaceInput & {
  id?: string;
  image?: string;
  detectedPlaceName?: string;
  googlePlaceName?: string | null;
  matchStatus?: 'verified' | 'needs_confirmation' | 'not_found';
  verificationScore?: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  Restaurant: '식당',
  Cafe: '카페',
  Bar: '바',
  Hotel: '숙소',
  Attraction: '관광명소',
  Shopping: '쇼핑',
  Activity: '액티비티',
  Nature: '자연',
  Other: '기타',
};
const COUNTRY_LABELS: Record<string, string> = {
  Indonesia: '인도네시아',
  Japan: '일본',
  'South Korea': '대한민국',
  France: '프랑스',
  Thailand: '태국',
  Vietnam: '베트남',
  Singapore: '싱가포르',
  Malaysia: '말레이시아',
  Taiwan: '대만',
  China: '중국',
  Italy: '이탈리아',
  Spain: '스페인',
  Portugal: '포르투갈',
  'United States': '미국',
  'United Kingdom': '영국',
  Australia: '호주',
};
const LOCATION_LABELS: Record<string, string> = {
  Bali: '발리',
  Ubud: '우붓',
  Seminyak: '스미냑',
  Tokyo: '도쿄',
  Taito: '다이토',
  Minato: '미나토',
  Shibuya: '시부야',
  Shinjuku: '신주쿠',
  Chuo: '주오',
  Seoul: '서울',
  Seochon: '서촌',
  Gangnam: '강남',
  'Jahamun-ro 8-gil': '자하문로 8길',
  'Bukchon-ro 4-gil': '북촌로 4길',
  Paris: '파리',
  Nice: '니스',
};
const categoryLabel = (value?: string | null) =>
  (value && CATEGORY_LABELS[value]) || value || '기타';
const countryLabel = (value?: string | null) =>
  (value && COUNTRY_LABELS[value]) || value || '국가 미상';
const locationLabel = (value?: string | null) =>
  (value && LOCATION_LABELS[value]) || value || null;

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? '요청을 처리하지 못했어요.');
  return body;
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="mb-7 flex min-h-12 items-center gap-3">
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onBack}
        aria-label="뒤로 가기"
        className="-ml-2 rounded-full"
      >
        <ArrowLeft />
      </Button>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
    </header>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 pb-28 pt-7 sm:px-8">
      <div className="mx-auto w-full max-w-[430px]">{children}</div>
    </main>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Empty className="min-h-[360px] border bg-card/70">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="size-12 rounded-full bg-destructive/10 text-destructive"
        >
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle className="text-lg">장소를 불러오지 못했어요</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={retry} variant="outline" className="h-11 rounded-xl">
          <RefreshCw /> 다시 시도
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function RegionCard({
  region,
  onClick,
}: {
  region: RegionSummary;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex min-h-20 w-full items-center gap-3 rounded-[1.25rem] border bg-card p-3 text-left shadow-[0_8px_28px_rgba(29,78,216,0.06)] transition hover:-translate-y-0.5 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      {region.thumbnailUrl ? (
        <img
          src={region.thumbnailUrl}
          alt=""
          className="size-14 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <MapPin />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-bold tracking-tight">
          {locationLabel(region.destination)}
        </span>
        <span className="mt-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-primary" />
          {countryLabel(region.country)}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-lg font-bold text-primary">
          {region.count}
        </span>
        <span className="block text-xs text-muted-foreground">곳</span>
      </span>
      <ChevronRight className="size-5 text-primary/55" />
    </button>
  );
}

function HomeView({
  total,
  regions,
  state,
  error,
  retry,
  onAdd,
  onRegion,
}: {
  total: number;
  regions: RegionSummary[];
  state: LoadState;
  error: string;
  retry: () => void;
  onAdd: () => void;
  onRegion: (region: RegionSummary) => void;
}) {
  return (
    <Shell>
      <header className="mb-9">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <MapPin className="size-4" />
          </span>
          인스타그램 여행지
        </div>
        <h1 className="text-[2.35rem] font-semibold leading-none tracking-[-0.05em]">
          저장한 장소
        </h1>
        {state === 'ready' && (
          <p className="mt-3 text-base text-muted-foreground">
            총 <span className="font-semibold text-foreground">{total}</span>곳
            {' · '}여행지 {regions.length}개
          </p>
        )}
      </header>
      {state === 'loading' && (
        <div className="space-y-3" aria-label="저장한 여행지 불러오는 중">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-20 rounded-[1.25rem]" />
          ))}
        </div>
      )}
      {state === 'error' && <Failure message={error} retry={retry} />}
      {state === 'ready' && regions.length === 0 && (
        <Empty className="min-h-[420px] border border-dashed bg-card/60">
          <EmptyHeader>
            <EmptyMedia
              variant="icon"
              className="size-12 rounded-full bg-secondary text-primary"
            >
              <MapPin />
            </EmptyMedia>
            <EmptyTitle className="text-lg">
              아직 저장한 장소가 없어요
            </EmptyTitle>
            <EmptyDescription>
              기억해 두고 싶은 장소가 있나요? 인스타그램 게시물이나 릴스 링크를
              붙여 넣어 저장해 보세요.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onAdd} size="lg" className="h-12 rounded-xl px-5">
              첫 장소 추가하기
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {state === 'ready' && regions.length > 0 && (
        <section aria-labelledby="regions-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="regions-heading"
              className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              내 여행지
            </h2>
            <button
              onClick={retry}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="여행지 다시 불러오기"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          <div className="space-y-3">
            {regions.map((region) => (
              <RegionCard
                key={`${region.destination}-${region.country}`}
                region={region}
                onClick={() => onRegion(region)}
              />
            ))}
          </div>
        </section>
      )}
      <button
        onClick={onAdd}
        aria-label="장소 추가"
        className="fixed bottom-6 left-1/2 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-[0_14px_35px_rgba(37,99,235,0.32)]"
      >
        <Plus className="size-5" /> 장소 추가
      </button>
    </Shell>
  );
}

function AddView({
  onBack,
  onAnalyze,
  onManualSearch,
}: {
  onBack: () => void;
  onAnalyze: (url: string) => void;
  onManualSearch: () => void;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const analyze = () => {
    if (
      !/^https:\/\/(www\.)?instagram\.com\/(?:reel|reels|p)\/[A-Za-z0-9_-]+\/?/.test(
        url,
      )
    ) {
      setError('올바른 인스타그램 게시물 또는 릴스 URL을 붙여 넣어 주세요.');
      return;
    }
    onAnalyze(url);
  };
  const paste = async () => {
    try {
      setUrl(await navigator.clipboard.readText());
      setError('');
    } catch {
      setError('클립보드를 읽을 수 없어요. URL을 직접 붙여 넣어 주세요.');
    }
  };
  return (
    <Shell>
      <TopBar title="장소 추가" onBack={onBack} />
      <div className="mb-8">
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Instagram />
        </span>
        <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em]">
          인스타그램 링크를 붙여 넣으면
          <br />
          장소를 찾아드려요.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          인스타그램에서 게시물 링크를 복사해 아래에 붙여 넣어 주세요.
        </p>
      </div>
      <label htmlFor="reel-url" className="mb-2 block text-sm font-semibold">
        인스타그램 게시물 또는 릴스 URL
      </label>
      <div
        className={`flex rounded-2xl border bg-card p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-ring/20 ${error ? 'border-destructive' : ''}`}
      >
        <input
          id="reel-url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError('');
          }}
          placeholder="https://instagram.com/p/..."
          className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
        />
        <Button
          variant="secondary"
          size="lg"
          className="h-11 rounded-xl"
          onClick={paste}
        >
          <Clipboard /> 붙여넣기
        </Button>
      </div>
      {error && (
        <p className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {error}
        </p>
      )}
      <Button
        variant="ghost"
        onClick={() => onManualSearch()}
        className="mt-4 h-12 w-full rounded-xl"
      >
        <Search /> 장소 직접 검색하기
      </Button>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 p-4 backdrop-blur">
        <Button
          onClick={analyze}
          disabled={!url}
          className="mx-auto flex h-14 w-full max-w-[430px] rounded-2xl text-base"
        >
          게시물 분석하기 <Sparkles />
        </Button>
      </div>
    </Shell>
  );
}
function AnalyzingView() {
  return (
    <Shell>
      <div className="flex min-h-[72vh] flex-col items-center justify-center text-center">
        <div className="relative mb-7 grid size-24 place-items-center rounded-[2rem] bg-secondary text-primary">
          <span className="absolute inset-0 animate-ping rounded-[2rem] bg-primary/10" />
          <LoaderCircle className="size-9 animate-spin" />
        </div>
        <h1 className="text-2xl font-semibold">장소를 찾고 있어요…</h1>
        <p className="mt-3 max-w-xs text-base text-muted-foreground">
          게시물을 읽고 장소를 추출한 뒤 Google Places에서 확인하고 있어요.
        </p>
      </div>
    </Shell>
  );
}
function PlacePreview({ place }: { place: ResultPlace }) {
  return (
    <article className="overflow-hidden rounded-[1.6rem] border bg-card shadow-[0_12px_40px_rgba(29,78,216,0.09)]">
      {place.image && (
        <div className="relative aspect-[16/9]">
          <img
            src={place.image}
            alt={`${place.area ?? '여행지'}의 ${place.name}`}
            className="h-full w-full object-cover"
          />
          <Badge className="absolute left-4 top-4 h-8 rounded-full bg-card/95 px-3 text-primary">
            <Check className="size-3.5" /> Google 장소 확인됨
          </Badge>
        </div>
      )}
      <div className="p-5">
        {!place.image && (
          <Badge className="mb-4 h-8 rounded-full bg-secondary px-3 text-primary">
            <Check className="size-3.5" /> Google 장소 확인됨
          </Badge>
        )}
        <p className="mb-2 flex items-center gap-1.5 text-base font-semibold text-primary">
          <MapPin className="size-4" />
          {locationLabel(place.area) ?? '세부 지역 미상'},{' '}
          {locationLabel(place.destination ?? place.city) ?? '여행지 미상'}
        </p>
        <h2 className="text-2xl font-bold leading-tight">{place.name}</h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {categoryLabel(place.category)} · {countryLabel(place.country)}
        </p>
        {place.status &&
          place.status !== 'open' &&
          place.status !== 'unknown' && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {place.status === 'permanently_closed'
                ? '폐업한 장소예요'
                : '임시 휴업 중이에요'}
            </p>
          )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <a
            href={place.instagramReelUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"
          >
            <Instagram className="size-4" />
            Instagram
          </a>
          <a
            href={place.googleMapsUrl ?? '#'}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"
          >
            <Map className="size-4" />
            Google 지도
          </a>
        </div>
      </div>
    </article>
  );
}
function ResultView({
  place,
  onBack,
  onSave,
}: {
  place: ResultPlace;
  onBack: () => void;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '장소를 저장하지 못했어요.',
      );
      setSaving(false);
    }
  };
  return (
    <Shell>
      <TopBar title="장소를 찾았어요" onBack={onBack} />
      <PlacePreview place={place} />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 p-4 backdrop-blur">
        <Button
          onClick={save}
          disabled={saving}
          className="mx-auto flex h-14 w-full max-w-[430px] rounded-2xl text-base"
        >
          {saving ? (
            <>
              <LoaderCircle className="animate-spin" /> 저장 중…
            </>
          ) : (
            <>
              장소 저장하기 <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </Shell>
  );
}
function MessageView({
  onBack,
  onRegion,
}: {
  onBack: () => void;
  onRegion: () => void;
}) {
  return (
    <Shell>
      <TopBar title="이미 저장한 장소예요" onBack={onBack} />
      <Empty className="min-h-[520px] border bg-card/70">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-14 rounded-full bg-secondary text-primary"
          >
            <Check />
          </EmptyMedia>
          <EmptyTitle className="text-xl">이미 저장한 장소예요</EmptyTitle>
          <EmptyDescription>
            중복으로 저장하지 않았어요. 해당 여행지에서 기존 장소를 확인할 수
            있어요.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRegion} className="h-12 rounded-xl px-5">
            저장한 장소 보기
          </Button>
        </EmptyContent>
      </Empty>
    </Shell>
  );
}
function NotFoundView({
  onBack,
  onManualSearch,
}: {
  onBack: () => void;
  onManualSearch: () => void;
}) {
  return (
    <Shell>
      <TopBar title="장소를 찾지 못했어요" onBack={onBack} />
      <Empty className="min-h-[520px] border bg-card/70">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-14 rounded-full bg-secondary text-primary"
          >
            <Search />
          </EmptyMedia>
          <EmptyTitle className="text-xl">장소를 확인하기 어려워요</EmptyTitle>
          <EmptyDescription>
            게시물에 위치 정보가 부족할 수 있어요. 직접 검색하거나 다른 링크를
            시도해 보세요.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onManualSearch} className="h-12 rounded-xl px-5">
            직접 검색하기
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-12 rounded-xl px-5"
          >
            다른 게시물 시도하기
          </Button>
        </EmptyContent>
      </Empty>
    </Shell>
  );
}

function ManualSearchView({
  onBack,
  onSelect,
  initialQuery = '',
}: {
  onBack: () => void;
  onSelect: (place: VerifiedPlace) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [state, setState] = useState<
    'default' | 'searching' | 'results' | 'empty' | 'error'
  >('default');
  const [selecting, setSelecting] = useState('');
  const requestId = useRef(0);
  const search = useCallback(async (value: string) => {
    const id = ++requestId.current;
    setState('searching');
    try {
      const data = await requestJson<{ results: PlaceSearchResult[] }>(
        `/api/places/search?q=${encodeURIComponent(value)}`,
      );
      if (id !== requestId.current) return;
      setResults(data.results);
      setState(data.results.length ? 'results' : 'empty');
    } catch {
      if (id === requestId.current) setState('error');
    }
  }, []);
  useEffect(() => {
    if (query.trim().length < 3) {
      requestId.current += 1;
      setResults([]);
      setState('default');
      return;
    }
    const timer = setTimeout(() => void search(query), 450);
    return () => clearTimeout(timer);
  }, [query, search]);
  const select = async (result: PlaceSearchResult) => {
    setSelecting(result.googlePlaceId);
    try {
      const data = await requestJson<{ place: VerifiedPlace }>(
        `/api/places/details/${encodeURIComponent(result.googlePlaceId)}`,
      );
      onSelect(data.place);
    } catch {
      setState('error');
      setSelecting('');
    }
  };
  return (
    <Shell>
      <TopBar title="장소 검색" onBack={onBack} />
      <div className="relative">
        <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="WYAH Ubud"
          className="h-14 w-full rounded-2xl border bg-card pl-12 pr-4 text-base outline-none focus:ring-4 focus:ring-ring/20"
        />
      </div>
      {state === 'default' && (
        <p className="mt-3 text-sm text-muted-foreground">
          Google Places에서 검색할 글자를 3자 이상 입력해 주세요.
        </p>
      )}
      {state === 'searching' && (
        <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          장소 검색 중…
        </div>
      )}
      {state === 'empty' && (
        <Empty className="mt-8 min-h-72 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>검색 결과가 없어요</EmptyTitle>
            <EmptyDescription>
              도시, 세부 지역, 국가명을 함께 입력해 보세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {state === 'error' && (
        <Failure
          message="장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요."
          retry={() => void search(query)}
        />
      )}
      {state === 'results' && (
        <div className="mt-5 space-y-3">
          {results.map((result) => (
            <button
              key={result.googlePlaceId}
              onClick={() => void select(result)}
              disabled={Boolean(selecting)}
              className="flex min-h-24 w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left disabled:opacity-60"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <MapPin />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{result.name}</span>
                <span className="mt-1 block text-sm text-primary">
                  {[
                    locationLabel(result.area),
                    locationLabel(result.destination ?? result.city),
                    countryLabel(result.country),
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {result.address}
                </span>
              </span>
              {selecting === result.googlePlaceId ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <ChevronRight className="size-5 text-primary/50" />
              )}
            </button>
          ))}
        </div>
      )}
    </Shell>
  );
}

function CandidatesView({
  places,
  onBack,
  onManualSearch,
  onSave,
}: {
  places: ResultPlace[];
  onBack: () => void;
  onManualSearch: (query?: string) => void;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState(defaultSelectedResultIds(places));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toggle = (id: string, checked: boolean) =>
    setSelected((current) =>
      checked
        ? [...new Set([...current, id])]
        : current.filter((item) => item !== id),
    );
  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(selected);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '장소를 저장하지 못했어요.',
      );
      setSaving(false);
    }
  };
  return (
    <Shell>
      <TopBar title="저장할 장소 선택" onBack={onBack} />
      <div className="mb-5 flex items-end justify-between gap-4">
        <p className="max-w-[17rem] text-base text-muted-foreground">
          저장할 장소를 모두 선택해 주세요.
        </p>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-primary">
          {selected.length}개 선택
        </span>
      </div>
      <div className="space-y-3">
        {places.map((place) => {
          const id = resultPlaceId(place);
          const checked = selected.includes(id);
          const needsConfirmation = place.matchStatus === 'needs_confirmation';
          const notFound = place.matchStatus === 'not_found';
          return (
            <div
              key={id}
              className={`rounded-2xl border bg-card p-4 ${checked ? 'border-primary/55 bg-primary/[0.035]' : ''} ${needsConfirmation ? 'border-amber-300/80 bg-amber-50/40' : ''}`}
            >
              <div className="flex items-start gap-3">
                {place.image && (
                  <img
                    src={place.image}
                    alt=""
                    className="size-12 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {place.matchStatus === 'verified' && (
                    <Badge className="mb-2 bg-secondary text-primary">
                      <Check className="size-3" /> Google 장소 확인됨
                    </Badge>
                  )}
                  {needsConfirmation && (
                    <Badge className="mb-2 bg-amber-100 text-amber-800">
                      <CircleAlert className="size-3" /> 확인 필요
                    </Badge>
                  )}
                  {notFound && (
                    <Badge
                      variant="outline"
                      className="mb-2 text-muted-foreground"
                    >
                      Google 결과 없음
                    </Badge>
                  )}
                  {needsConfirmation ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          영상에서 읽은 이름
                        </p>
                        <p className="font-bold">{place.detectedPlaceName}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          저장될 Google 장소
                        </p>
                        <p className="font-bold text-primary">
                          {place.googlePlaceName}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <h2 className="font-bold">
                      {place.detectedPlaceName ?? place.name}
                    </h2>
                  )}
                  <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                    <MapPin className="size-3.5" />
                    {[
                      locationLabel(place.area),
                      locationLabel(place.destination ?? place.city),
                    ]
                      .filter(Boolean)
                      .join(', ') || '위치 정보 미상'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {categoryLabel(place.category)} ·{' '}
                    {Math.round(
                      (place.verificationScore ?? place.confidence ?? 0) * 100,
                    )}
                    % 일치
                  </p>
                </div>
                {!notFound && (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggle(id, value === true)}
                    aria-label={`${place.googlePlaceName ?? place.name} 선택`}
                    className="size-6 rounded-lg"
                  />
                )}
              </div>
              {notFound && (
                <div className="mt-3 border-t pt-3">
                  <p className="mb-2 text-sm text-muted-foreground">
                    Google에서 정확한 장소를 찾지 못했어요.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      onManualSearch(place.detectedPlaceName ?? place.name)
                    }
                    className="h-11 w-full rounded-xl"
                  >
                    <Search /> 직접 검색
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button
        variant="ghost"
        onClick={() => onManualSearch()}
        className="mt-5 h-12 w-full rounded-xl"
      >
        해당하는 장소 없음 · 직접 검색하기
      </Button>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 p-4 backdrop-blur">
        <Button
          onClick={save}
          disabled={selected.length === 0 || saving}
          className="mx-auto flex h-14 w-full max-w-[430px] rounded-2xl text-base"
        >
          {saving ? (
            <>
              <LoaderCircle className="animate-spin" /> 저장 중…
            </>
          ) : (
            <>
              {selected.length}개 장소 저장하기 <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </Shell>
  );
}

function PlaceCard({
  place,
  onDelete,
}: {
  place: SavedPlaceView;
  onDelete: (id: string) => void;
}) {
  return (
    <article className="rounded-2xl border bg-card p-4 shadow-[0_6px_24px_rgba(29,78,216,0.06)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
            <MapPin className="size-4" />
            {locationLabel(place.area) ?? '세부 지역 미상'},{' '}
            {locationLabel(place.destination ?? place.city) ?? '여행지 미상'}
          </p>
          <h3 className="text-[1.05rem] font-bold leading-snug">
            {place.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {categoryLabel(place.category)}
          </p>
        </div>
        {place.thumbnailUrl && (
          <img
            src={place.thumbnailUrl}
            alt=""
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${place.name} 더보기`}
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>
              <ExternalLink /> 상세 보기
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(place.id)}
            >
              <Trash2 /> 장소 삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-3 flex gap-5 border-t pt-2">
        <a
          href={place.instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-primary"
        >
          <Instagram className="size-4" />
          Instagram
        </a>
        {place.googleMapsUrl && (
          <a
            href={place.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Map className="size-4" />
            지도
          </a>
        )}
      </div>
    </article>
  );
}
function RegionView({
  destination,
  country,
  onBack,
  onChanged,
}: {
  destination: string;
  country: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [places, setPlaces] = useState<SavedPlaceView[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setState('loading');
    try {
      const result = await requestJson<{ places: SavedPlaceView[] }>(
        `/api/regions/${encodeURIComponent(destination)}?country=${encodeURIComponent(country)}`,
      );
      setPlaces(result.places);
      setState('ready');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '이 여행지를 불러오지 못했어요.',
      );
      setState('error');
    }
  }, [destination, country]);
  useEffect(() => {
    void load();
  }, [load]);
  const remove = async (id: string) => {
    try {
      await requestJson(`/api/places/${id}`, { method: 'DELETE' });
      await load();
      onChanged();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '장소를 삭제하지 못했어요.',
      );
    }
  };
  const grouped = Object.groupBy(places, (place) => place.area ?? '기타 지역');
  return (
    <Shell>
      <TopBar
        title={locationLabel(destination) ?? destination}
        onBack={onBack}
      />
      <div className="mb-7 rounded-[1.5rem] bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-75">{countryLabel(country)}</p>
        <p className="mt-1 text-3xl font-semibold">
          저장한 장소 {places.length}곳
        </p>
      </div>
      {state === 'loading' && (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      )}
      {state === 'error' && <Failure message={error} retry={load} />}
      {state === 'ready' && places.length === 0 && (
        <Empty className="min-h-[340px] border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MapPin />
            </EmptyMedia>
            <EmptyTitle>
              {locationLabel(destination) ?? destination}에 저장한 장소가 없어요
            </EmptyTitle>
            <EmptyDescription>
              홈으로 돌아가 다른 여행지를 보거나 새 장소를 추가해 보세요.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {state === 'ready' && (
        <div className="space-y-8">
          {Object.entries(grouped).map(([area, items]) => (
            <section key={area}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {locationLabel(area) ?? area}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {items?.length}곳
                </span>
              </div>
              <div className="space-y-3">
                {items?.map((place) => (
                  <PlaceCard key={place.id} place={place} onDelete={remove} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}

export function TravelApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [regions, setRegions] = useState<RegionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState('');
  const [selectedRegion, setSelectedRegion] = useState({
    destination: 'Bali',
    country: 'Indonesia',
  });
  const [reelUrl, setReelUrl] = useState(featuredPlace.instagramReelUrl);
  const [resultPlace, setResultPlace] = useState<ResultPlace>(featuredPlace);
  const [analysisResults, setAnalysisResults] = useState<ResultPlace[]>([]);
  const [analysisMessage, setAnalysisMessage] = useState('');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const openManualSearch = (query = '') => {
    setManualSearchQuery(query);
    setScreen('manual-search');
  };
  const loadRegions = useCallback(async () => {
    setLoadState('loading');
    try {
      const result = await requestJson<{
        total: number;
        regions: RegionSummary[];
      }>('/api/regions');
      setTotal(result.total);
      setRegions(result.regions);
      setLoadState('ready');
    } catch (reason) {
      setLoadError(
        reason instanceof Error ? reason.message : '장소를 불러오지 못했어요.',
      );
      setLoadState('error');
    }
  }, []);
  useEffect(() => {
    void loadRegions();
  }, [loadRegions]);
  const analyze = async (url: string) => {
    setReelUrl(url);
    setAnalysisMessage('');
    setScreen('analyzing');
    try {
      const data = await requestJson<ReelAnalysisResult>('/api/reels/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const places: ResultPlace[] = data.places.map((place) => ({
        ...place,
        instagramReelUrl: data.reel.url,
        instagramThumbnail: data.reel.thumbnailUrl,
        image: data.reel.thumbnailUrl ?? undefined,
      }));
      setReelUrl(data.reel.url);
      setAnalysisResults(places);
      if (data.status === 'single' && places[0]) {
        setResultPlace(places[0]);
        setScreen('result');
      } else if (data.status === 'multiple' || data.status === 'candidates') {
        setScreen(places.length ? 'candidates' : 'not-found');
      } else if (data.status === 'not_found') {
        setScreen('not-found');
      } else {
        setAnalysisMessage(
          data.message ?? '이 인스타그램 게시물을 분석하지 못했어요.',
        );
        setScreen('analysis-error');
      }
    } catch (reason) {
      setAnalysisMessage(
        reason instanceof Error
          ? reason.message
          : '이 인스타그램 게시물을 분석하지 못했어요.',
      );
      setScreen('analysis-error');
    }
  };
  const save = async (places: ResultPlace[]) => {
    const payload: PlaceInput[] = places.map(
      ({
        id: _id,
        image: _image,
        detectedPlaceName: _detectedPlaceName,
        googlePlaceName: _googlePlaceName,
        matchStatus: _matchStatus,
        verificationScore: _verificationScore,
        ...place
      }) => ({
        ...place,
        instagramReelUrl: reelUrl,
      }),
    );
    const result = await requestJson<{ status: 'saved' | 'duplicate' }>(
      '/api/places/save',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ places: payload }),
      },
    );
    setSelectedRegion({
      destination: places[0].destination ?? places[0].city ?? '여행지 미상',
      country: places[0].country ?? '국가 미상',
    });
    await loadRegions();
    setScreen(result.status === 'duplicate' ? 'duplicate' : 'region');
  };
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'start_instagram_analysis',
          title: '인스타그램 게시물 분석',
          description:
            '인스타그램 게시물이나 릴스를 분석해 확인된 여행 장소를 찾습니다.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
            required: ['url'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: true },
          execute(input: unknown) {
            const data = input as { url?: string };
            if (
              !data.url ||
              !/^https:\/\/(www\.)?instagram\.com\/(?:reel|reels|p)\//.test(
                data.url,
              )
            )
              throw new Error(
                '올바른 인스타그램 게시물 또는 릴스 URL이 필요해요.',
              );
            void analyze(data.url);
            return { status: 'analyzing', url: data.url };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  if (screen === 'home')
    return (
      <HomeView
        total={total}
        regions={regions}
        state={loadState}
        error={loadError}
        retry={loadRegions}
        onAdd={() => setScreen('add')}
        onRegion={(value) => {
          setSelectedRegion(value);
          setScreen('region');
        }}
      />
    );
  if (screen === 'add')
    return (
      <AddView
        onBack={() => setScreen('home')}
        onAnalyze={analyze}
        onManualSearch={() => openManualSearch()}
      />
    );
  if (screen === 'analyzing') return <AnalyzingView />;
  if (screen === 'result')
    return (
      <ResultView
        place={resultPlace}
        onBack={() => setScreen('add')}
        onSave={() => save([resultPlace])}
      />
    );
  if (screen === 'duplicate')
    return (
      <MessageView
        onBack={() => setScreen('add')}
        onRegion={() => setScreen('region')}
      />
    );
  if (screen === 'not-found')
    return (
      <NotFoundView
        onBack={() => setScreen('add')}
        onManualSearch={() => openManualSearch()}
      />
    );
  if (screen === 'analysis-error')
    return (
      <Shell>
        <TopBar title="분석하지 못했어요" onBack={() => setScreen('add')} />
        <Failure
          message={analysisMessage}
          retry={() => void analyze(reelUrl)}
        />
        <Button
          variant="ghost"
          onClick={() => openManualSearch()}
          className="mt-4 h-12 w-full rounded-xl"
        >
          <Search /> 직접 검색하기
        </Button>
      </Shell>
    );
  if (screen === 'candidates')
    return (
      <CandidatesView
        places={analysisResults}
        onBack={() => setScreen('add')}
        onManualSearch={openManualSearch}
        onSave={(ids) =>
          save(
            analysisResults.filter((place) =>
              ids.includes(resultPlaceId(place)),
            ),
          )
        }
      />
    );
  if (screen === 'manual-search')
    return (
      <ManualSearchView
        onBack={() => setScreen('add')}
        initialQuery={manualSearchQuery}
        onSelect={(place) => {
          setResultPlace({ ...place, instagramReelUrl: reelUrl });
          setScreen('result');
        }}
      />
    );
  return (
    <RegionView
      destination={selectedRegion.destination}
      country={selectedRegion.country}
      onBack={() => {
        void loadRegions();
        setScreen('home');
      }}
      onChanged={() => void loadRegions()}
    />
  );
}
