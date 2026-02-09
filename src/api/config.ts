/**
 * Configurações da API Socrata (City of Chicago Open Data)
 * 
 * Endpoints base e parâmetros de query para consumo dos datasets
 * Limite de 1000 registros por request + aggregação por Community Area
 */

export const API_CONFIG = {
  /**
   * Base URL da API Socrata (City of Chicago)
   * Usando /resource/ (público) ao invés de /api/v3/views/ (requer token)
   */
  BASE_URL: 'https://data.cityofchicago.org/resource',

  /**
   * Cook County GIS Data (Parcels)
   */
  COOK_COUNTY_GIS: 'https://datacatalog.cookcountyil.gov/resource',

  /**
   * Endpoints dos datasets (usando IDs de resource)
   */
  ENDPOINTS: {
    PARKS: 'ejsh-fztr',              // Parks - Chicago Park District Park Boundaries
    COMMUNITY_AREAS: 'igwz-8jzy',     // Boundaries - Community Areas (current)
    PARCELS_GIS: '77tz-riq7',         // Cook County Parcels (GIS Data) - fetch sob demanda
  },

  /**
   * Limites de query (performance + throttling)
   */
  LIMITS: {
    DEFAULT: 1000,                 // Limite padrão Socrata
    MAX_SODA_2_0: 50000,          // Limite máximo SODA 2.0
    PROPERTY_AGGREGATED: 1000,    // Limite para dados agregados de propriedade
  },
} as const;

/**
 * Retorna headers necessários para requisições City of Chicago
 * Inclui App Token específico do domínio
 * 
 * CRÍTICO: App Tokens NÃO são intercambiáveis entre domínios
 */
export function getChicagoHeaders(): Record<string, string> {
  const appToken = import.meta.env.VITE_CHICAGO_APP_TOKEN;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  if (appToken) {
    headers['X-App-Token'] = appToken;
  }
  
  return headers;
}

/**
 * Retorna headers necessários para requisições Cook County
 * Inclui App Token específico do domínio (diferente do Chicago!)
 * 
 * CRÍTICO: Usar token do Cook County para datacatalog.cookcountyil.gov
 */
export function getCookCountyHeaders(): Record<string, string> {
  const appToken = import.meta.env.VITE_COOKCOUNTY_APP_TOKEN;
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  
  if (appToken) {
    headers['X-App-Token'] = appToken;
  }
  
  return headers;
}

/**
 * Retorna headers corretos baseado no endpoint
 * @deprecated Use getChicagoHeaders() ou getCookCountyHeaders() diretamente
 */
export function getSocrataHeaders(): Record<string, string> {
  // Manter por compatibilidade - usa Chicago por padrão
  return getChicagoHeaders();
}

/**
 * Helper para construir URL de query Socrata
 * 
 * Usando endpoint público /resource/{id}.json (não requer token)
 * API: https://dev.socrata.com/foundry/data.cityofchicago.org/{id}
 */
export function buildSocrataQuery(
  endpoint: string,
  options: {
    limit?: number;
    offset?: number;
    where?: string;
    select?: string;
  } = {}
): string {
  const { limit = API_CONFIG.LIMITS.DEFAULT, offset = 0, where, select } = options;
  
  // Determinar base URL (Chicago ou Cook County)
  const baseUrl = endpoint === API_CONFIG.ENDPOINTS.PARCELS_GIS
    ? `${API_CONFIG.COOK_COUNTY_GIS}/${endpoint}.json`
    : `${API_CONFIG.BASE_URL}/${endpoint}.json`;

  // API /resource/ usa $limit, $offset, $where, $select
  const params = new URLSearchParams({
    '$limit': String(limit),
    '$offset': String(offset),
  });

  // Adicionar filtros se fornecidos
  if (where) {
    params.append('$where', where);
  }
  
  if (select) {
    params.append('$select', select);
  }

  const url = `${baseUrl}?${params.toString()}`;
  console.log('[API] Built URL:', url);
  
  return url;
}
