export const API_TIMEOUT_MS = 15000;
export const NETWORK_ERROR = "Can't reach the server. Check your connection.";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let token = null;
let unauthorizedHandler = () => {};

export const setAuthToken = (value) => { token = value; };
export const onUnauthorized = (handler) => { unauthorizedHandler = handler; };

export async function api(path, { method = 'GET', body } = {}) {
  const sentToken = token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(process.env.EXPO_PUBLIC_API_URL + path, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(sentToken ? { Authorization: 'Bearer ' + sentToken } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, 0);
  } finally {
    clearTimeout(timer);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  // Only an authenticated request can mean "session expired"; a 401 from
  // login is simply a wrong password.
  if (res.status === 401 && sentToken) {
    unauthorizedHandler();
    throw new ApiError(data.error || 'Session expired. Please sign in again.', 401);
  }
  if (!res.ok) throw new ApiError(data.error || 'Request failed', res.status);
  return data;
}
