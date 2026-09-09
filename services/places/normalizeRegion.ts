import { countryRegionCode } from './searchContext.ts';

export type RegionNormalizationInput = {
  country?: string | null;
  countryCode?: string | null;
  locality?: string | null;
  adminArea1?: string | null;
  adminArea2?: string | null;
  neighborhood?: string | null;
  sublocality1?: string | null;
  sublocality2?: string | null;
  adminArea3?: string | null;
  route?: string | null;
  formattedAddress?: string | null;
  fallbackArea?: string | null;
};

export type NormalizedRegion = {
  country: string | null;
  destination: string | null;
  area: string | null;
};

const TOKYO_WARDS = new Map<string, string>([
  ['adachi', '아다치'],
  ['arakawa', '아라카와'],
  ['bunkyo', '분쿄'],
  ['chiyoda', '지요다'],
  ['chuo', '주오'],
  ['edogawa', '에도가와'],
  ['itabashi', '이타바시'],
  ['katsushika', '가쓰시카'],
  ['kita', '기타'],
  ['koto', '고토'],
  ['meguro', '메구로'],
  ['minato', '미나토'],
  ['nakano', '나카노'],
  ['nerima', '네리마'],
  ['ota', '오타'],
  ['setagaya', '세타가야'],
  ['shibuya', '시부야'],
  ['shinagawa', '시나가와'],
  ['shinjuku', '신주쿠'],
  ['suginami', '스기나미'],
  ['sumida', '스미다'],
  ['taito', '다이토'],
  ['toshima', '도시마'],
]);

const SEOUL_DISTRICTS = new Map<string, string>([
  ['jongno', '종로'],
  ['gangnam', '강남'],
  ['mapo', '마포'],
  ['jung', '중구'],
  ['seongdong', '성동'],
  ['yongsan', '용산'],
  ['songpa', '송파'],
  ['seocho', '서초'],
  ['yeongdeungpo', '영등포'],
  ['dongdaemun', '동대문'],
  ['seodaemun', '서대문'],
  ['gwangjin', '광진'],
  ['gangdong', '강동'],
  ['gangseo', '강서'],
  ['gwanak', '관악'],
  ['eunpyeong', '은평'],
  ['dobong', '도봉'],
  ['nowon', '노원'],
  ['seongbuk', '성북'],
  ['gangbuk', '강북'],
  ['guro', '구로'],
  ['geumcheon', '금천'],
  ['dongjak', '동작'],
  ['yangcheon', '양천'],
]);

const SEOUL_NEIGHBORHOODS = new Map<string, string>([
  ['seochon', '서촌'],
  ['서촌', '서촌'],
  ['bukchon', '북촌'],
  ['북촌', '북촌'],
  ['seongsu', '성수'],
  ['성수', '성수'],
  ['hannam', '한남'],
  ['한남', '한남'],
]);

const BALI_AREAS = new Map<string, string>([
  ['ubud', '우붓'],
  ['seminyak', '스미냑'],
  ['canggu', '짱구'],
  ['kuta', '꾸따'],
  ['legian', '레기안'],
  ['sanur', '사누르'],
  ['nusa dua', '누사두아'],
  ['uluwatu', '울루와뚜'],
  ['jimbaran', '짐바란'],
]);

const DESTINATION_ALIASES = new Map<string, string>([
  ['seoul', '서울'],
  ['서울', '서울'],
  ['tokyo', '도쿄'],
  ['東京都', '도쿄'],
  ['도쿄', '도쿄'],
  ['bali', '발리'],
  ['발리', '발리'],
  ['paris', '파리'],
  ['nice', '니스'],
  ['gongju', '공주'],
  ['gongju-si', '공주'],
  ['goseong', '고성'],
  ['goseong-gun', '고성'],
  ['sokcho', '속초'],
  ['sokcho-si', '속초'],
]);

const GENERIC_AREA_ALIASES = new Map<string, string>([
  ['jugwang-myeon', '죽왕'],
  ['toseong-myeon', '토성'],
  ['jungang-dong', '중앙'],
  ['중앙동', '중앙'],
]);

const clean = (value?: string | null) => value?.trim() || null;
const key = (value?: string | null) =>
  clean(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase() ?? '';

function countryDisplay(country?: string | null, countryCode?: string | null) {
  const regionCode = countryRegionCode(country, countryCode);
  if (regionCode) {
    const display = new Intl.DisplayNames(['ko'], { type: 'region' }).of(
      regionCode.toUpperCase(),
    );
    if (display) return display;
  }
  return clean(country);
}

function normalizeAdministrativeKey(value?: string | null) {
  return key(value)
    .replace(/\s+(city|ward|district)$/u, '')
    .replace(/-(si|gun|gu|ku)$/u, '')
    .replace(/(?:시|군|구)$/u, '')
    .trim();
}

function directAlias(
  aliases: Map<string, string>,
  values: Array<string | null | undefined>,
) {
  for (const value of values) {
    const normalized = normalizeAdministrativeKey(value);
    const match = aliases.get(normalized) ?? aliases.get(key(value));
    if (match) return match;
  }
  return null;
}

function addressAlias(aliases: Map<string, string>, address?: string | null) {
  const normalizedAddress = key(address);
  if (!normalizedAddress) return null;
  for (const [alias, display] of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(?:^|[^a-z])${escaped}(?:-(?:gu|si|gun)|\\s+(?:district|city|ward)|[^a-z]|$)`,
      'u',
    );
    if (pattern.test(normalizedAddress)) return display;
  }
  return null;
}

export function isStreetLevelRegion(
  value?: string | null,
  route?: string | null,
) {
  const normalized = key(value);
  if (!normalized) return false;
  if (route && normalized === key(route)) return true;
  return (
    /(?:^|[-\s])(?:road|street|st|rd|route)$/u.test(normalized) ||
    /-(?:ro|gil)$/u.test(normalized) ||
    /(?:로|길)$/u.test(normalized) ||
    /\d+(?:[.-]\d+)*/u.test(normalized)
  );
}

function safeAreaCandidate(
  values: Array<string | null | undefined>,
  destination: string | null,
  route?: string | null,
) {
  const destinationKey = key(destination);
  return (
    values
      .map(clean)
      .find(
        (value) =>
          value &&
          key(value) !== destinationKey &&
          !isStreetLevelRegion(value, route),
      ) ?? null
  );
}

/** Converts raw Google geography into Korean UI grouping values. */
export function normalizeRegion(
  input: RegionNormalizationInput,
): NormalizedRegion {
  const regionCode = countryRegionCode(input.country, input.countryCode);
  const country = countryDisplay(input.country, input.countryCode);
  const localityKey = key(input.locality);
  const admin1Key = key(input.adminArea1);
  const admin2Key = key(input.adminArea2);
  const addressKey = key(input.formattedAddress);

  const tokyoWard = directAlias(TOKYO_WARDS, [
    input.locality,
    input.adminArea2,
    input.sublocality1,
    input.sublocality2,
    input.fallbackArea,
  ]);
  if (
    regionCode === 'jp' &&
    (tokyoWard ||
      [localityKey, admin1Key, admin2Key].some((value) =>
        value.includes('tokyo'),
      ) ||
      addressKey.includes('tokyo'))
  )
    return { country, destination: '도쿄', area: tokyoWard };

  const isSeoul = [localityKey, admin1Key, admin2Key].some((value) =>
    value.includes('seoul'),
  );
  if (regionCode === 'kr' && (isSeoul || addressKey.includes('seoul'))) {
    const neighborhood = directAlias(SEOUL_NEIGHBORHOODS, [
      input.neighborhood,
      input.sublocality2,
      input.sublocality1,
      input.fallbackArea,
    ]);
    const district =
      directAlias(SEOUL_DISTRICTS, [
        input.adminArea3,
        input.adminArea2,
        input.sublocality1,
        input.locality,
        input.fallbackArea,
      ]) ?? addressAlias(SEOUL_DISTRICTS, input.formattedAddress);
    return {
      country,
      destination: '서울',
      area: neighborhood ?? district,
    };
  }

  const baliArea = directAlias(BALI_AREAS, [
    input.neighborhood,
    input.sublocality2,
    input.sublocality1,
    input.locality,
    input.adminArea3,
    input.adminArea2,
    input.fallbackArea,
  ]);
  if (
    regionCode === 'id' &&
    (baliArea || admin1Key.includes('bali') || addressKey.includes('bali'))
  )
    return { country, destination: '발리', area: baliArea };

  const rawDestination =
    clean(input.locality) ?? clean(input.adminArea1) ?? clean(input.adminArea2);
  const destination =
    directAlias(DESTINATION_ALIASES, [rawDestination]) ?? rawDestination;
  const rawArea = safeAreaCandidate(
    [
      input.neighborhood,
      input.sublocality2,
      input.sublocality1,
      input.adminArea3,
      input.adminArea2,
      input.fallbackArea,
    ],
    destination,
    input.route,
  );
  const area =
    directAlias(GENERIC_AREA_ALIASES, [rawArea]) ??
    directAlias(DESTINATION_ALIASES, [rawArea]) ??
    rawArea;
  return {
    country,
    destination,
    area: area && key(area) !== key(destination) ? area : null,
  };
}
