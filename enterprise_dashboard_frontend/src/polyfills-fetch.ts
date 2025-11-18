/**
 * Minimal fetch shim to satisfy TypeScript/lint and SSR environments.
 * In browsers, global fetch exists. In Node (SSR), if fetch is missing we define a stub that throws.
 * This avoids adding extra dependencies while keeping linter happy.
 */

// PUBLIC_INTERFACE
export async function ensureFetch(): Promise<void> {
  const g: any = (typeof globalThis !== 'undefined' ? globalThis : {}) as any;
  if (typeof g.fetch === 'function') {
    return;
  }
  g.fetch = () => {
    throw new Error('fetch is not available in this environment.');
  };
}
