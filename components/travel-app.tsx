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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? 'Something went wrong.');
  return body;
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="mb-7 flex min-h-12 items-center gap-3">
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={onBack}
        aria-label="Go back"
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
        <EmptyTitle className="text-lg">Couldn’t load places</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={retry} variant="outline" className="h-11 rounded-xl">
          <RefreshCw /> Try again
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
          {region.region}
        </span>
        <span className="mt-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <MapPin className="size-3.5 text-primary" />
          {region.country}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-lg font-bold text-primary">
          {region.count}
        </span>
        <span className="block text-xs text-muted-foreground">places</span>
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
          Reel Places
        </div>
        <h1 className="text-[2.35rem] font-semibold leading-none tracking-[-0.05em]">
          Saved places
        </h1>
        {state === 'ready' && (
          <p className="mt-3 text-base text-muted-foreground">
            <span className="font-semibold text-foreground">{total}</span>{' '}
            places across {regions.length} regions
          </p>
        )}
      </header>
      {state === 'loading' && (
        <div className="space-y-3" aria-label="Loading saved regions">
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
            <EmptyTitle className="text-lg">No saved places yet</EmptyTitle>
            <EmptyDescription>
              Found somewhere worth remembering? Paste its Instagram Reel and
              we’ll help you save it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onAdd} size="lg" className="h-12 rounded-xl px-5">
              Add your first place
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
              Your regions
            </h2>
            <button
              onClick={retry}
              className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="Reload regions"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
          <div className="space-y-3">
            {regions.map((region) => (
              <RegionCard
                key={`${region.region}-${region.country}`}
                region={region}
                onClick={() => onRegion(region)}
              />
            ))}
          </div>
        </section>
      )}
      <button
        onClick={onAdd}
        aria-label="Add a place"
        className="fixed bottom-6 left-1/2 flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-[0_14px_35px_rgba(37,99,235,0.32)]"
      >
        <Plus className="size-5" /> Add place
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
      !/^https:\/\/(www\.)?instagram\.com\/reel(s)?\/[A-Za-z0-9_-]+\/?/.test(
        url,
      )
    ) {
      setError('Paste a valid Instagram Reel URL.');
      return;
    }
    onAnalyze(url);
  };
  const paste = async () => {
    try {
      setUrl(await navigator.clipboard.readText());
      setError('');
    } catch {
      setError('Clipboard access is unavailable. Paste the URL manually.');
    }
  };
  return (
    <Shell>
      <TopBar title="Add a place" onBack={onBack} />
      <div className="mb-8">
        <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <Instagram />
        </span>
        <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.04em]">
          Paste a Reel.
          <br />
          We’ll find the place.
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Copy the link from Instagram and paste it below.
        </p>
      </div>
      <label htmlFor="reel-url" className="mb-2 block text-sm font-semibold">
        Instagram Reel URL
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
          placeholder="https://instagram.com/reel/..."
          className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none"
        />
        <Button
          variant="secondary"
          size="lg"
          className="h-11 rounded-xl"
          onClick={paste}
        >
          <Clipboard /> Paste
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
        <Search /> Search for a place manually
      </Button>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 p-4 backdrop-blur">
        <Button
          onClick={analyze}
          disabled={!url}
          className="mx-auto flex h-14 w-full max-w-[430px] rounded-2xl text-base"
        >
          Analyze Reel <Sparkles />
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
        <h1 className="text-2xl font-semibold">Finding this place…</h1>
        <p className="mt-3 max-w-xs text-base text-muted-foreground">
          Reading the Reel, extracting places, and checking Google Places.
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
            alt={`${place.name} in ${place.area}`}
            className="h-full w-full object-cover"
          />
          <Badge className="absolute left-4 top-4 h-8 rounded-full bg-card/95 px-3 text-primary">
            <Check className="size-3.5" /> Verified place
          </Badge>
        </div>
      )}
      <div className="p-5">
        {!place.image && (
          <Badge className="mb-4 h-8 rounded-full bg-secondary px-3 text-primary">
            <Check className="size-3.5" /> Verified place
          </Badge>
        )}
        <p className="mb-2 flex items-center gap-1.5 text-base font-semibold text-primary">
          <MapPin className="size-4" />
          {place.area ?? 'Unknown area'}, {place.city ?? 'Unknown region'}
        </p>
        <h2 className="text-2xl font-bold leading-tight">{place.name}</h2>
        <p className="mt-2 text-sm font-medium text-muted-foreground">
          {place.category} · {place.country}
        </p>
        {place.status &&
          place.status !== 'open' &&
          place.status !== 'unknown' && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              {place.status === 'permanently_closed'
                ? 'Permanently closed'
                : 'Temporarily closed'}
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
            Google Maps
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
        reason instanceof Error ? reason.message : 'Could not save this place.',
      );
      setSaving(false);
    }
  };
  return (
    <Shell>
      <TopBar title="Place found" onBack={onBack} />
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
              <LoaderCircle className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              Save place <ArrowRight />
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
      <TopBar title="Already saved" onBack={onBack} />
      <Empty className="min-h-[520px] border bg-card/70">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-14 rounded-full bg-secondary text-primary"
          >
            <Check />
          </EmptyMedia>
          <EmptyTitle className="text-xl">
            This place is already saved
          </EmptyTitle>
          <EmptyDescription>
            No duplicate was created. You can find the existing place in its
            region.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onRegion} className="h-12 rounded-xl px-5">
            View saved place
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
      <TopBar title="No place found" onBack={onBack} />
      <Empty className="min-h-[520px] border bg-card/70">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-14 rounded-full bg-secondary text-primary"
          >
            <Search />
          </EmptyMedia>
          <EmptyTitle className="text-xl">
            We couldn’t identify a place
          </EmptyTitle>
          <EmptyDescription>
            The Reel may not include enough location detail. Search for it
            manually or try another link.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onManualSearch} className="h-12 rounded-xl px-5">
            Search manually
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="h-12 rounded-xl px-5"
          >
            Try another Reel
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
      <TopBar title="Search places" onBack={onBack} />
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
          Enter at least 3 characters to search Google Places.
        </p>
      )}
      {state === 'searching' && (
        <div className="mt-8 flex items-center justify-center gap-2 text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin" />
          Searching places…
        </div>
      )}
      {state === 'empty' && (
        <Empty className="mt-8 min-h-72 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>No places found</EmptyTitle>
            <EmptyDescription>
              Try adding a city, area, or country.
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
                  {[result.area, result.city, result.country]
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
        reason instanceof Error ? reason.message : 'Could not save places.',
      );
      setSaving(false);
    }
  };
  return (
    <Shell>
      <TopBar title="Select places" onBack={onBack} />
      <div className="mb-5 flex items-end justify-between gap-4">
        <p className="max-w-[17rem] text-base text-muted-foreground">
          Select every place you want to save.
        </p>
        <span className="shrink-0 rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-primary">
          {selected.length} selected
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
                      <Check className="size-3" /> Google Places verified
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
                    {[place.area, place.city].filter(Boolean).join(', ') ||
                      'Unknown location'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {place.category} ·{' '}
                    {Math.round(
                      (place.verificationScore ?? place.confidence ?? 0) * 100,
                    )}
                    % match
                  </p>
                </div>
                {!notFound && (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => toggle(id, value === true)}
                    aria-label={`Select ${place.googlePlaceName ?? place.name}`}
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
        None of these — search manually
      </Button>
      <div className="fixed inset-x-0 bottom-0 border-t bg-background/90 p-4 backdrop-blur">
        <Button
          onClick={save}
          disabled={selected.length === 0 || saving}
          className="mx-auto flex h-14 w-full max-w-[430px] rounded-2xl text-base"
        >
          {saving ? (
            <>
              <LoaderCircle className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              Save {selected.length}{' '}
              {selected.length === 1 ? 'place' : 'places'} <ArrowRight />
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
            {place.area ?? 'Unspecified'}, {place.city}
          </p>
          <h3 className="text-[1.05rem] font-bold leading-snug">
            {place.name}
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {place.category ?? 'Other'}
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
            aria-label={`More options for ${place.name}`}
            className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem>
              <ExternalLink /> Open details
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(place.id)}
            >
              <Trash2 /> Delete place
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
          Reel
        </a>
        {place.googleMapsUrl && (
          <a
            href={place.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-9 items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Map className="size-4" />
            Maps
          </a>
        )}
      </div>
    </article>
  );
}
function RegionView({
  region,
  country,
  onBack,
  onChanged,
}: {
  region: string;
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
        `/api/regions/${encodeURIComponent(region)}?country=${encodeURIComponent(country)}`,
      );
      setPlaces(result.places);
      setState('ready');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not load this region.',
      );
      setState('error');
    }
  }, [region, country]);
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
        reason instanceof Error
          ? reason.message
          : 'Could not delete this place.',
      );
    }
  };
  const grouped = Object.groupBy(places, (place) => place.area ?? 'Other');
  return (
    <Shell>
      <TopBar title={region} onBack={onBack} />
      <div className="mb-7 rounded-[1.5rem] bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-75">{country}</p>
        <p className="mt-1 text-3xl font-semibold">
          {places.length} saved places
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
            <EmptyTitle>No places left in {region}</EmptyTitle>
            <EmptyDescription>
              Return home to browse another region or add a place.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {state === 'ready' && (
        <div className="space-y-8">
          {Object.entries(grouped).map(([area, items]) => (
            <section key={area}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{area}</h2>
                <span className="text-sm text-muted-foreground">
                  {items?.length} places
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
    region: 'Bali',
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
        reason instanceof Error ? reason.message : 'Could not load places.',
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
        setAnalysisMessage(data.message ?? 'We could not analyze this Reel.');
        setScreen('analysis-error');
      }
    } catch (reason) {
      setAnalysisMessage(
        reason instanceof Error
          ? reason.message
          : 'We could not analyze this Reel.',
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
      region: places[0].city ?? 'Unknown',
      country: places[0].country ?? 'Unknown',
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
          name: 'start_reel_analysis',
          title: 'Analyze Reel',
          description:
            'Analyze an Instagram Reel and find verified travel places.',
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
              !/^https:\/\/(www\.)?instagram\.com\/reel(s)?\//.test(data.url)
            )
              throw new Error('A valid Instagram Reel URL is required.');
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
        <TopBar title="Analysis failed" onBack={() => setScreen('add')} />
        <Failure
          message={analysisMessage}
          retry={() => void analyze(reelUrl)}
        />
        <Button
          variant="ghost"
          onClick={() => openManualSearch()}
          className="mt-4 h-12 w-full rounded-xl"
        >
          <Search /> Search manually
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
      region={selectedRegion.region}
      country={selectedRegion.country}
      onBack={() => {
        void loadRegions();
        setScreen('home');
      }}
      onChanged={() => void loadRegions()}
    />
  );
}
