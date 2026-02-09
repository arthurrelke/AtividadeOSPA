import { computed, ref } from 'vue';

export type Locale = 'en' | 'pt-BR';

type MessageDict = Record<string, string>;

type Messages = Record<Locale, MessageDict>;

const STORAGE_KEY = 'ospa.locale';

const messages: Messages = {
  en: {
    'app.title': 'Chicago Valuation Analysis',
    'app.subtitle': 'Chicago analysis platform to measure area value uplift using DePaul University methodology.',

    'sidebar.mapLayers': 'Map Layers',
    'sidebar.communityAreaAnalysis': 'Community Area Analysis',
    'sidebar.empty.title': 'Ready for Real Estate Analysis',
    'sidebar.empty.desc': 'Click on a Community Area on the map to view strategic coverage insights based on proximity to parks.',
    'sidebar.empty.methodology': 'Methodology: DePaul University - The 606 Trail Impact',
    'sidebar.footer.data': 'Data: City of Chicago Open Data Portal',
    'sidebar.language.aria': 'Language',

    'layers.toggleAria': 'Toggle {layer} visibility',
    'layers.community-areas': 'Community Areas',
    'layers.critical-areas': 'Critical Areas',
    'layers.parks': 'Parks',
    'layers.park-buffers': 'Park Valuation Buffers',

    'analysis.closeAria': 'Close analysis',
    'analysis.communityArea': 'Community Area #{num}',
    'analysis.strategicTitle': 'Strategic Analysis',
    'analysis.level': 'Level',
    'analysis.coverage': 'Buffer coverage (0.2 mi)',
    'analysis.outside': 'Outside',
    'analysis.inside': 'Inside',
    'analysis.avgUplift': 'Average uplift potential',
    'analysis.methodology': 'Methodology: DePaul University',

    'severity.notCritical': 'Not critical',
    'severity.attention': 'Attention',
    'severity.critical': 'Critical',

    'map.tooltip.immediate': 'Immediate uplift (0.2 mi)',
    'map.tooltip.none': 'No uplift (0.6+ mi)',
    'map.tooltip.byDistance': 'Uplift by distance (outside 0.2 mi)',
    'map.tooltip.nearestPark': 'Distance to nearest park',
    'map.tooltip.methodology': 'Methodology: DePaul University',

    'tutorial.welcome': '👋 Hello OSPA, this is a quick guide to the platform!',
    'tutorial.follow': 'Follow',
    'tutorial.skip': 'Skip',
    'tutorial.next': 'Next',
    'tutorial.finish': 'Finish',

    'tutorial.step.1.title': 'Sidebar',
    'tutorial.step.1.body': 'This panel is the product: toggle layers and read the strategic analysis for the selected sector.',
    'tutorial.step.2.title': 'Map layers',
    'tutorial.step.2.body': 'Use these toggles to show/hide parks, sectors and valuation buffers.',
    'tutorial.step.3.title': 'Valuation buffers',
    'tutorial.step.3.body': 'Turn on Valuation Buffers to enable the hover tooltip and see uplift potential by distance.',
    'tutorial.step.4.title': 'Language',
    'tutorial.step.4.body': 'Switch the UI between English and Portuguese (Brazil).',
  },
  'pt-BR': {
    'app.title': 'Chicago Valuation Analysis',
    'app.subtitle': 'Plataforma de análise para a cidade de Chicago para medir a valorização das áreas a partir da metodologia da Universidade de DePaul.',

    'sidebar.mapLayers': 'Camadas do Mapa',
    'sidebar.communityAreaAnalysis': 'Análise por Setor Censitário',
    'sidebar.empty.title': 'Pronto para Análise',
    'sidebar.empty.desc': 'Clique em um Setor Censitário no mapa para ver insights estratégicos de cobertura com base na proximidade de parques.',
    'sidebar.empty.methodology': 'Metodologia: DePaul University - Impacto do The 606',
    'sidebar.footer.data': 'Dados: City of Chicago Open Data Portal',
    'sidebar.language.aria': 'Idioma',

    'layers.toggleAria': 'Alternar visibilidade de {layer}',
    'layers.community-areas': 'Setores Censitários',
    'layers.critical-areas': 'Áreas Críticas',
    'layers.parks': 'Parques',
    'layers.park-buffers': 'Buffers de Valorização',

    'analysis.closeAria': 'Fechar análise',
    'analysis.communityArea': 'Setor Censitário #{num}',
    'analysis.strategicTitle': 'Análise Estratégica',
    'analysis.level': 'Nível',
    'analysis.coverage': 'Cobertura do buffer (0,2 mi)',
    'analysis.outside': 'Fora',
    'analysis.inside': 'Dentro',
    'analysis.avgUplift': 'Potencial médio de valorização',
    'analysis.methodology': 'Metodologia: DePaul University',

    'severity.notCritical': 'Não crítico',
    'severity.attention': 'Atenção',
    'severity.critical': 'Crítico',

    'map.tooltip.immediate': 'Valorização imediata (0,2 mi)',
    'map.tooltip.none': 'Sem valorização (0,6+ mi)',
    'map.tooltip.byDistance': 'Valorização por distância (fora de 0,2 mi)',
    'map.tooltip.nearestPark': 'Distância ao parque mais próximo',
    'map.tooltip.methodology': 'Metodologia: DePaul University',

    'tutorial.welcome': '👋 Olá OSPA, este é um guia rápido sobre a plataforma!',
    'tutorial.follow': 'Seguir',
    'tutorial.skip': 'Pular',
    'tutorial.next': 'Próximo',
    'tutorial.finish': 'Concluir',

    'tutorial.step.1.title': 'Sidebar',
    'tutorial.step.1.body': 'Este painel é o produto: controle camadas e leia a análise estratégica do setor selecionado.',
    'tutorial.step.2.title': 'Camadas do mapa',
    'tutorial.step.2.body': 'Use estes toggles para mostrar/ocultar parques, setores e buffers de valoração.',
    'tutorial.step.3.title': 'Buffers de valoração',
    'tutorial.step.3.body': 'Ative Buffers de Valoração para habilitar o tooltip no hover e ver o potencial por distância.',
    'tutorial.step.4.title': 'Idioma',
    'tutorial.step.4.body': 'Alterne a UI entre Inglês e Português (Brasil).',
  },
};

function loadInitialLocale(): Locale {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'en' || saved === 'pt-BR') return saved;
  return 'pt-BR';
}

const locale = ref<Locale>(loadInitialLocale());

function format(message: string, params?: Record<string, string | number>): string {
  if (!params) return message;
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.split(`{${key}}`).join(String(value));
  }, message);
}

export function t(key: string, params?: Record<string, string | number>): string {
  const message = messages[locale.value][key] ?? messages.en[key] ?? key;
  return format(message, params);
}

export function setLocale(next: Locale): void {
  locale.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
}

export function useI18n() {
  return {
    locale,
    setLocale,
    t,
    isEnglish: computed(() => locale.value === 'en'),
  };
}
