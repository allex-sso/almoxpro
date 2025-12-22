
interface ImportMetaEnv {
  readonly VITE_INVENTORY_URL: string;
  readonly VITE_IN_URL: string;
  readonly VITE_OUT_URL: string;
  readonly VITE_OS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
