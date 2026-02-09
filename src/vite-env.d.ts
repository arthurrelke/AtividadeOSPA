// Declarações de tipo para imports que o TypeScript não reconhece nativamente

/// <reference types="vite/client" />

// Declaração para componentes .vue
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Declaração para variáveis de ambiente Vite
interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string;
  // Adicionar outras variáveis de ambiente aqui se necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
