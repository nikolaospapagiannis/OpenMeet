import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import ReactNativeBiometrics from 'react-native-biometrics';
import { api } from '../../services/api';

const rnBiometrics = new ReactNativeBiometrics();

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  biometricEnabled: false,
  biometricAvailable: false,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

export const refreshAccessToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const response = await api.post('/auth/refresh', {
      refreshToken: state.auth.refreshToken,
    });
    return response.data;
  }
);

export const checkBiometricAvailability = createAsyncThunk(
  'auth/checkBiometric',
  async () => {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType };
  }
);

export const authenticateWithBiometric = createAsyncThunk(
  'auth/biometricAuth',
  async () => {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: 'Confirm your identity',
    });
    if (!success) {
      throw new Error('Biometric authentication failed');
    }
    // Retrieve stored credentials and login
    // This is a simplified version - in production, use secure storage
    return { success };
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        refreshToken: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
    },
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })
      // Refresh token
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Token refresh failed, clear credentials
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })
      // Biometric availability
      .addCase(checkBiometricAvailability.fulfilled, (state, action) => {
        state.biometricAvailable = action.payload.available;
      })
      // Biometric authentication
      .addCase(authenticateWithBiometric.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(authenticateWithBiometric.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(authenticateWithBiometric.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Biometric authentication failed';
      });
  },
});

export const { setCredentials, clearCredentials, setBiometricEnabled, clearError } =
  authSlice.actions;

export default authSlice.reducer;
