import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types/auth';
import { clearAccessToken, setAccessToken } from '../services/token';

interface AuthState {
  user: User | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; accessToken: string }>) {
      state.user = action.payload.user;
      state.initialized = true;
      setAccessToken(action.payload.accessToken);
      try {
        window.localStorage.setItem('helpdesk-cached-user', JSON.stringify(action.payload.user));
      } catch {
        // ignore storage errors
      }
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      try {
        window.localStorage.setItem('helpdesk-cached-user', JSON.stringify(action.payload));
      } catch {
        // ignore storage errors
      }
    },
    clearCredentials(state) {
      state.user = null;
      state.initialized = true;
      clearAccessToken();
      try {
        window.localStorage.removeItem('helpdesk-cached-user');
      } catch {
        // ignore storage errors
      }
    },
    setInitialized(state, action: PayloadAction<boolean>) {
      state.initialized = action.payload;
    }
  }
});

export const { setCredentials, setUser, clearCredentials, setInitialized } = authSlice.actions;
export default authSlice.reducer;
