import { Injectable } from '@angular/core';

/**
 * PUBLIC_INTERFACE
 * EnvConfigService
 * Provides access to environment configuration variables for the application sourced from NG_APP_* values.
 */
@Injectable({ providedIn: 'root' })
export class EnvConfigService {
  /**
   * Get API base URL from environment variables.
   */
  // PUBLIC_INTERFACE
  getApiBaseUrl(): string {
    /** Returns NG_APP_API_BASE or NG_APP_BACKEND_URL if available, otherwise empty string */
    const env = (globalThis as any)?.process?.env ?? {};
    return (
      env['NG_APP_API_BASE'] ||
      env['NG_APP_BACKEND_URL'] ||
      ''
    );
  }

  /**
   * PUBLIC_INTERFACE
   * Returns backend base URL (HTTP).
   */
  getBackendUrl(): string {
    const env = (globalThis as any)?.process?.env ?? {};
    return env['NG_APP_BACKEND_URL'] || env['NG_APP_API_BASE'] || '';
  }

  /**
   * PUBLIC_INTERFACE
   * Returns WebSocket URL.
   */
  getWebSocketUrl(): string {
    const env = (globalThis as any)?.process?.env ?? {};
    return env['NG_APP_WS_URL'] || '';
  }

  /**
   * PUBLIC_INTERFACE
   * Returns current node environment if provided.
   */
  getNodeEnv(): string {
    const env = (globalThis as any)?.process?.env ?? {};
    return env['NG_APP_NODE_ENV'] || '';
  }
}
