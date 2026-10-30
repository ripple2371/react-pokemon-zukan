import { QueryClient } from '@tanstack/react-query';

export const resourceQueryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, retry: false,
} } });

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
// 全画面を通じて実通信は最大6本。失敗はキャッシュされず次回再試行できる。
let active = 0;
const waiting: (() => void)[] = [];
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= 6) await new Promise<void>((resolve) => waiting.push(resolve));
  else active++;
  try { return await task(); }
  finally { const next = waiting.shift(); if (next) next(); else active--; }
}
export function fetchResource<T>(url: string, message: string): Promise<T> {
  return resourceQueryClient.fetchQuery({
    queryKey: ['resource', url.replace(/\/$/, '')],
    queryFn: () => limited(async () => {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new ApiError(message, response.status);
      return await response.json() as T;
    }),
  });
}
