/**
 * Composable para gerenciamento de dados de parques
 * 
 * Responsabilidades:
 * - Fetch de dados via API
 * - Estado de loading
 * - Error handling
 * - Transformação de dados para consumo pelos componentes
 * - Filtros espaciais usando Turf.js
 * 
 * Mapbox NÃO faz fetch - apenas consome dados prontos deste composable
 */

import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { Park, CommunityArea } from '@/types';
import { fetchParks } from '@/api/chicago';
import * as turf from '@turf/turf';
import { useCache } from './useCache';

export function useParks() {
  // Estado reativo
  const parks = ref<Park[]>([]) as Ref<Park[]>;
  const loading = ref(false);
  const error = ref<Error | null>(null);
  
  // Cache
  const cache = useCache();

  /**
   * Busca dados de parques da API
   * 
   * CACHE DESABILITADO - dados muito grandes para localStorage
   */
  async function loadParks(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      console.log('Loading parks from API...');
      const data = await fetchParks();
      parks.value = data;
      console.log('Parks loaded:', data.length);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      console.error('Failed to load parks:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Filtra parques por Community Area usando cálculo geométrico
   * 
   * IMPORTANTE: Os datasets de Chicago NÃO incluem community_area_id
   * Necessário calcular espacialmente quais parques estão dentro de cada área
   * 
   * Usa Turf.js para point-in-polygon ou polygon intersection
   * Resultado é cacheado para performance
   * 
   * @param communityArea - Community Area com geometria
   * @returns Array de parques dentro daquela área
   */
  function getParksByArea(communityArea: CommunityArea): Park[] {
    // Tentar cache primeiro
    const cacheKey = `area-${communityArea.area_numbe}-${parks.value.length}`;
    const cached = cache.get<Park[]>('GEOMETRIC_CALC', cacheKey);
    if (cached) {
      return cached;
    }

    if (!communityArea.the_geom) {
      console.warn('Community Area sem geometria:', communityArea.community);
      return [];
    }

    try {
      const areaFeature = turf.feature(communityArea.the_geom as any);
      const areaBbox = turf.bbox(areaFeature) as [number, number, number, number];

      const filtered = parks.value.filter((park) => {
        if (!park.the_geom) return false;

        try {
          const parkFeature = turf.feature(park.the_geom as any);
          const parkBbox = turf.bbox(parkFeature) as [number, number, number, number];

          // Filtro rápido por bbox antes do booleanIntersects
          const overlaps =
            areaBbox[0] <= parkBbox[2] &&
            areaBbox[2] >= parkBbox[0] &&
            areaBbox[1] <= parkBbox[3] &&
            areaBbox[3] >= parkBbox[1];
          if (!overlaps) return false;

          // Interseção geométrica (parques podem ser Polygon ou MultiPolygon)
          return turf.booleanIntersects(parkFeature as any, areaFeature as any);
        } catch (err) {
          console.warn(`Erro ao processar geometria do parque ${park.park_name}:`, err);
          return false;
        }
      });

      // Cachear resultado
      cache.set('GEOMETRIC_CALC', cacheKey, filtered);
      
      return filtered;
    } catch (err) {
      console.error('Erro ao filtrar parques por área:', err);
      return [];
    }
  }


  /**
   * Calcula área total de parques em uma Community Area
   * 
   * @param communityArea - Community Area para calcular
   * @returns Área total em acres
   */
  function getTotalParkAcresByArea(communityArea: CommunityArea): number {
    const areaParks = getParksByArea(communityArea);
    return areaParks.reduce((sum, park) => sum + (park.acres || 0), 0);
  }

  /**
   * Calcula área total de parques (em acres)
   */
  const totalParkAcres = computed(() => {
    return parks.value.reduce((sum, park) => sum + (park.acres || 0), 0);
  });

  /**
   * Retorna total de parques carregados
   */
  const parkCount = computed(() => parks.value.length);

  return {
    // Estado
    parks,
    loading,
    error,

    // Computed
    totalParkAcres,
    parkCount,

    // Métodos
    loadParks,
    getParksByArea,
    getTotalParkAcresByArea,
  };
}
