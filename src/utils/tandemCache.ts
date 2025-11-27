import { getBolusEvents } from '../functions/tandem';

interface CachedRange {
  start: number;
  end: number;
}

interface BaseEvent {
  id: number;
  name: string;
  seqNum: number;
  eventTimestamp: string | Date; // Date when live, string when from JSON
}

const CACHE_KEY_DATA = 'tandem_bolus_cache_data';
const CACHE_KEY_RANGES = 'tandem_bolus_cache_ranges';

export const clearTandemCache = () => {
  localStorage.removeItem(CACHE_KEY_DATA);
  localStorage.removeItem(CACHE_KEY_RANGES);
};

interface CachedEvent extends Omit<BaseEvent, 'eventTimestamp'> {
  eventTimestamp: Date;
}

export const getSmartBolusData = async (
  start: Date,
  end: Date,
  credentials: { email: string; password: string; region: string }
) => {
  const reqStart = start.getTime();
  const reqEnd = end.getTime();

  // 1. Load Cache
  let cachedRanges: CachedRange[] = JSON.parse(localStorage.getItem(CACHE_KEY_RANGES) || '[]');
  let rawCachedData: BaseEvent[] = JSON.parse(localStorage.getItem(CACHE_KEY_DATA) || '[]');

  // Normalize dates in cachedData (JSON parsing makes them strings)
  let cachedData: CachedEvent[] = rawCachedData.map(d => ({
    ...d,
    eventTimestamp: new Date(d.eventTimestamp)
  }));

  // 2. Calculate Missing Ranges
  let neededRanges: CachedRange[] = [{ start: reqStart, end: reqEnd }];

  for (const cached of cachedRanges) {
    const nextNeeded: CachedRange[] = [];
    for (const needed of neededRanges) {
      // Case 1: Cached covers needed completely
      if (cached.start <= needed.start && cached.end >= needed.end) {
        continue;
      }
      // Case 2: Disjoint
      if (cached.end < needed.start || cached.start > needed.end) {
        nextNeeded.push(needed);
        continue;
      }
      // Case 3: Overlap
      if (cached.start > needed.start) {
        nextNeeded.push({ start: needed.start, end: cached.start });
      }
      if (cached.end < needed.end) {
        nextNeeded.push({ start: cached.end, end: needed.end });
      }
    }
    neededRanges = nextNeeded;
  }

  // 3. Fetch Missing Data
  if (neededRanges.length > 0) {
    console.log('Fetching missing ranges:', neededRanges);
    const newEvents: CachedEvent[] = [];

    // Optimization: Merge close ranges to avoid too many requests?
    // For now, just fetch each needed range.
    for (const range of neededRanges) {
      try {
        console.log(`Fetching range: ${new Date(range.start).toISOString()} - ${new Date(range.end).toISOString()}`);
        const result = await getBolusEvents({
          data: {
            email: credentials.email,
            password: credentials.password,
            startTime: new Date(range.start).toISOString(),
            endTime: new Date(range.end).toISOString(),
            region: credentials.region,
          }
        });
        
        // Result comes with Date objects if strictly typed, but wire transport might make them strings if not careful.
        // The createServerFn typically handles serialization, so we might get strings back for dates.
        // Let's normalize.
        const normalizedResult = result.map((e: any) => ({
            ...e,
            eventTimestamp: new Date(e.eventTimestamp)
        }));
        
        newEvents.push(...normalizedResult);
      } catch (err) {
        console.error('Failed to fetch range', range, err);
        // If a fetch fails, we just don't cache it, but we might return partial data?
        // Or throw? Let's throw for now to indicate issue.
        throw err;
      }
    }

    // 4. Update Cache
    cachedData = [...cachedData, ...newEvents];
    
    // Remove duplicates based on ID if possible, or just trust the ranges.
    // Duplicates might happen at boundaries.
    const uniqueDataMap = new Map<string, CachedEvent>();
    cachedData.forEach(d => {
        // Create a unique key. ID + timestamp?
        const key = `${d.id}-${d.eventTimestamp.getTime()}-${d.name}`;
        uniqueDataMap.set(key, d);
    });
    cachedData = Array.from(uniqueDataMap.values());

    // Merge ranges
    const allRanges = [...cachedRanges, ...neededRanges].sort((a, b) => a.start - b.start);
    const mergedRanges: CachedRange[] = [];
    
    if (allRanges.length > 0) {
        let current = allRanges[0];
        for (let i = 1; i < allRanges.length; i++) {
            const next = allRanges[i];
            if (next.start <= current.end + 1000) { // Allow 1s gap to merge
                current.end = Math.max(current.end, next.end);
            } else {
                mergedRanges.push(current);
                current = next;
            }
        }
        mergedRanges.push(current);
    }
    
    cachedRanges = mergedRanges;

    // Save to LocalStorage
    try {
        localStorage.setItem(CACHE_KEY_RANGES, JSON.stringify(cachedRanges));
        localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(cachedData));
    } catch (e) {
        console.error('Failed to save to localStorage (quota exceeded?)', e);
        // If quota exceeded, maybe clear old data? 
        // For now, just ignore save error.
    }
  }

  // 5. Return Filtered Data
  return cachedData.filter(d => {
      const t = d.eventTimestamp.getTime();
      return t >= reqStart && t <= reqEnd;
  });
};
