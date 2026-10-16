import { api, API_TIMEOUT_MS, ApiError, NETWORK_ERROR, onUnauthorized, setAuthToken } from '../src/api';

const json = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

beforeEach(() => {
  global.fetch = jest.fn();
  setAuthToken(null);
  onUnauthorized(() => {});
});
afterEach(() => jest.useRealTimers());

test('calls the configured base URL with JSON and the token', async () => {
  fetch.mockReturnValue(json(200, { years: [] }));
  setAuthToken('t1');
  await expect(api('/years', { method: 'POST', body: { year: 2026 } })).resolves.toEqual({ years: [] });
  const [url, opts] = fetch.mock.calls[0];
  expect(url).toBe('https://api.test/api/years');
  expect(opts.method).toBe('POST');
  expect(opts.body).toBe(JSON.stringify({ year: 2026 }));
  expect(opts.headers.Authorization).toBe('Bearer t1');
});

test('omits the token after sign-out', async () => {
  fetch.mockReturnValue(json(200, {}));
  setAuthToken('t1');
  setAuthToken(null);
  await api('/years');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
});

test('network failure becomes a status-0 ApiError', async () => {
  fetch.mockRejectedValue(new TypeError('Network request failed'));
  const err = await api('/years').catch((e) => e);
  expect(err).toBeInstanceOf(ApiError);
  expect(err.message).toBe(NETWORK_ERROR);
  expect(err.status).toBe(0);
});

test('a hanging request times out after 15 seconds', async () => {
  jest.useFakeTimers();
  fetch.mockImplementation((url, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
  }));
  const pending = api('/years').catch((e) => e);
  jest.advanceTimersByTime(API_TIMEOUT_MS);
  const err = await pending;
  expect(API_TIMEOUT_MS).toBe(15000);
  expect(err.message).toBe(NETWORK_ERROR);
  expect(err.status).toBe(0);
});

test('API error messages and statuses pass through', async () => {
  fetch.mockReturnValue(json(409, { error: 'That year already exists.' }));
  await expect(api('/years')).rejects.toMatchObject({ message: 'That year already exists.', status: 409 });
  fetch.mockReturnValue(Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new SyntaxError('bad')) }));
  await expect(api('/years')).rejects.toMatchObject({ message: 'Request failed', status: 500 });
});

test('401 calls the unauthorized handler once and rejects', async () => {
  const handler = jest.fn();
  onUnauthorized(handler);
  fetch.mockReturnValue(json(401, { error: 'Authentication required.' }));
  await expect(api('/years')).rejects.toMatchObject({ status: 401 });
  expect(handler).toHaveBeenCalledTimes(1);
});
