import { useEffect, useRef } from 'react';
import { api } from '../services/api';
import { setCredentials, clearCredentials, setInitialized } from '../store/authSlice';
import { useAppDispatch } from './useAppDispatch';

export function useBootstrapAuth() {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    let mounted = true;
    const bootstrap = async () => {
      try {
        const refresh = await api.post('/api/auth/refresh', {});
        const response = await api.get('/api/auth/me');
        if (mounted && response.data?.user) {
          dispatch(setCredentials({ user: response.data.user, accessToken: refresh.data.accessToken }));
        }
      } catch {
        dispatch(clearCredentials());
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
