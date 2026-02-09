/**
 * Composable para cache de dados e cálculos geométricos
 * 
 * Motivação:
 * - Cálculos Turf.js (point-in-polygon, distance) são custosos
 * - Dados da API Socrata mudam raramente (parques, community areas)
 * - Evitar refetch e recálculo desnecessários
 * 
 * Estratégia:
 * - localStorage para cache simples (< 10MB)
 * - TTL (Time To Live) configurável por tipo de dado
 * - Invalidação manual quando necessário
 */

import { ref } from 'vue';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em ms
}

/**
 * TTLs padrão (em milissegundos)
 */
const DEFAULT_TTLS = {
  COMMUNITY_AREAS: 7 * 24 * 60 * 60 * 1000, // 7 dias (dados estáveis)
  PARKS: 7 * 24 * 60 * 60 * 1000,            // 7 dias
  WATERWAYS: 7 * 24 * 60 * 60 * 1000,        // 7 dias
  PROPERTY_DATA: 24 * 60 * 60 * 1000,        // 1 dia (pode atualizar)
  GEOMETRIC_CALC: 24 * 60 * 60 * 1000,       // 1 dia (cálculos Turf)
};

export function useCache() {
  const cacheHits = ref(0);
  const cacheMisses = ref(0);

  /**
   * Gera chave única para o cache
   */
  function generateKey(namespace: string, identifier: string): string {
    return `chicago-parks:${namespace}:${identifier}`;
  }

  /**
   * Verifica se entrada do cache ainda é válida
   */
  function isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return now - entry.timestamp < entry.ttl;
  }

  /**
   * Obtém item do cache
   * 
   * @param namespace - Namespace do cache (ex: 'parks', 'calc-parks-by-area')
   * @param identifier - Identificador único (ex: 'all', 'area-23')
   * @returns Dados cacheados ou null se inválido/não encontrado
   */
  function get<T>(namespace: string, identifier: string): T | null {
    try {
      const key = generateKey(namespace, identifier);
      const cached = localStorage.getItem(key);

      if (!cached) {
        cacheMisses.value++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      if (!isValid(entry)) {
        // Cache expirado, remover
        localStorage.removeItem(key);
        cacheMisses.value++;
        return null;
      }

      cacheHits.value++;
      console.log(`[Cache HIT] ${namespace}:${identifier}`);
      return entry.data;
    } catch (err) {
      console.error('Erro ao ler cache:', err);
      cacheMisses.value++;
      return null;
    }
  }

  /**
   * Salva item no cache
   * 
   * @param namespace - Namespace do cache
   * @param identifier - Identificador único
   * @param data - Dados a cachear
   * @param ttl - Time to live (opcional, usa default do namespace)
   */
  function set<T>(
    namespace: string,
    identifier: string,
    data: T,
    ttl?: number
  ): void {
    try {
      const key = generateKey(namespace, identifier);
      
      // Determinar TTL
      const finalTtl = ttl || DEFAULT_TTLS[namespace as keyof typeof DEFAULT_TTLS] || DEFAULT_TTLS.GEOMETRIC_CALC;

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: finalTtl,
      };

      localStorage.setItem(key, JSON.stringify(entry));
      console.log(`[Cache SET] ${namespace}:${identifier} (TTL: ${finalTtl}ms)`);
    } catch (err) {
      // Quota exceeded - limpar cache antigo
      console.warn('Cache quota exceeded, clearing old entries...');
      clearExpired();
      
      // Tentar novamente
      try {
        const key = generateKey(namespace, identifier);
        const finalTtl = ttl || DEFAULT_TTLS.GEOMETRIC_CALC;
        const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl: finalTtl };
        localStorage.setItem(key, JSON.stringify(entry));
      } catch (retryErr) {
        console.error('Falha ao cachear mesmo após limpeza:', retryErr);
      }
    }
  }

  /**
   * Remove item específico do cache
   */
  function remove(namespace: string, identifier: string): void {
    const key = generateKey(namespace, identifier);
    localStorage.removeItem(key);
    console.log(`[Cache REMOVE] ${namespace}:${identifier}`);
  }

  /**
   * Limpa todo o cache do app
   */
  function clear(): void {
    const keys = Object.keys(localStorage);
    const appKeys = keys.filter(key => key.startsWith('chicago-parks:'));
    
    appKeys.forEach(key => localStorage.removeItem(key));
    console.log(`[Cache CLEAR] Removed ${appKeys.length} entries`);
  }

  /**
   * Remove apenas entradas expiradas
   */
  function clearExpired(): void {
    const keys = Object.keys(localStorage);
    const appKeys = keys.filter(key => key.startsWith('chicago-parks:'));
    
    let removed = 0;
    appKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const entry: CacheEntry<any> = JSON.parse(cached);
          if (!isValid(entry)) {
            localStorage.removeItem(key);
            removed++;
          }
        }
      } catch (err) {
        // Entry corrompida, remover
        localStorage.removeItem(key);
        removed++;
      }
    });

    console.log(`[Cache CLEANUP] Removed ${removed} expired entries`);
  }

  /**
   * Obtém estatísticas do cache
   */
  function getStats() {
    const keys = Object.keys(localStorage);
    const appKeys = keys.filter(key => key.startsWith('chicago-parks:'));
    
    let totalSize = 0;
    appKeys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) totalSize += value.length;
    });

    return {
      entries: appKeys.length,
      sizeKB: (totalSize / 1024).toFixed(2),
      hits: cacheHits.value,
      misses: cacheMisses.value,
      hitRate: cacheHits.value > 0 
        ? ((cacheHits.value / (cacheHits.value + cacheMisses.value)) * 100).toFixed(1)
        : '0',
    };
  }

  return {
    // Métodos principais
    get,
    set,
    remove,
    clear,
    clearExpired,

    // Estatísticas
    getStats,
    cacheHits,
    cacheMisses,
  };
}
