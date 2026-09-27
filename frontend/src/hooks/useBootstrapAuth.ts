import { useEffect } from 'react';
import { api, refreshAccessToken } from '../services/api';
import { setCredentials, clearCredentials, setInitialized, setUser } from '../store/authSlice';
import { useAppDispatch } from './useAppDispatch';

const CACHED_USER_KEY = 'helpdesk-cached-user';

/**
 * Stale-while-revalidate bootstrap: paint instantly from the cached user,
 * then confirm the session in the background. Repeat visits skip the
 * full-screen LoadingScreen wait entirely.
 *
 * NOTE: no hasRun ref guard here on purpose. React 18 StrictMode mounts,
 * unmounts and remounts effects in development; a "run once" ref causes the
 * first (cancelled) run to swallow bootstrap and leaves `initialized=false`
 * forever -> infinite LoadingScreen. Each mount runs its own bootstrap with
 * a `mounted` guard, and concurrent refresh calls are deduped single-flight
 * inside `refreshAccessToken()`.
 */
export function useBootstrapAuth() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    let mounted = true;

    try {
      const cached = window.localStorage.getItem(CACHED_USER_KEY);
      if (cached) {
        const user = JSON.parse(cached);
        if (user?._id) {
          dispatch(setUser(user));
          dispatch(setInitialized(true));
        }
      }
    } catch {
      // ignore corrupt cache
    }

    const bootstrap = async () => {
      try {
        // Single-flight + bypasses the 401 interceptor so one expired
        // session triggers exactly one refresh instead of a storm.
        const nextToken = await refreshAccessToken();
        if (!nextToken) throw new Error('no session');
        const response = await api.get('/api/auth/me');
        if (mounted && response.data?.user) {
          dispatch(setCredentials({ user: response.data.user, accessToken: nextToken }));
          try {
            window.localStorage.setItem(CACHED_USER_KEY, JSON.stringify(response.data.user));
          } catch {
            // ignore storage errors
          }
        }
      } catch {
        try {
          window.localStorage.removeItem(CACHED_USER_KEY);
        } catch {
          // ignore
        }
        if (mounted) {
          dispatch(clearCredentials());
        }
      } finally {
        if (mounted) {
          dispatch(setInitialized(true));
        }
      }
    };

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [dispatch]);
}
