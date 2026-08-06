/**
 * A tiny stand-in for `fetch`.
 *
 * React Native's fetch is not available under jest-expo, and the pieces the
 * client actually reads — status, `headers.get`, `json()` — are few enough that
 * a hand-rolled response is clearer than a whole-WHATWG polyfill.
 */

export type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {}
): Response {
  const headers = new Map(
    Object.entries({ 'Content-Type': 'application/json', ...init.headers }).map(
      ([key, value]) => [key.toLowerCase(), value]
    )
  );
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => headers.get(key.toLowerCase()) ?? null },
    json: async () => body,
  } as unknown as Response;
}

/**
 * Installs a mock as the global fetch and hands it back for assertions.
 *
 * The parameter is loosely typed because jest infers `[]` for a zero-argument
 * implementation, which is not assignable to fetch's signature.
 */
export function installFetchMock(implementation?: jest.Mock): FetchMock {
  const mock = (implementation ?? jest.fn()) as unknown as FetchMock;
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

/** Headers a given call was made with. */
export function headersOf(mock: FetchMock, callIndex: number): Record<string, string> {
  return (mock.mock.calls[callIndex]?.[1]?.headers ?? {}) as Record<string, string>;
}

export function urlOf(mock: FetchMock, callIndex: number): string {
  return mock.mock.calls[callIndex]?.[0] ?? '';
}
