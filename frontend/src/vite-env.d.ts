/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SANDBOX_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

