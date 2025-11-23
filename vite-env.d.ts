// Replaces /// <reference types="vite/client" /> to avoid missing type definition error
interface ImportMetaEnv {
  readonly VITE_INVENTORY_URL: string;
  readonly VITE_IN_URL: string;
  readonly VITE_OUT_URL: string;
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
