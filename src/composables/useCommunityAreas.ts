/**
 * Composable para gerenciamento de Community Areas
 * 
 * Responsabilidades:
 * - Fetch de Community Areas (77 divisões territoriais)
 * - Seleção de área (click no mapa)
 * - Agregação de dados da área selecionada usando composables externos
 */

import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import type { CommunityArea, SelectedAreaData } from '@/types';
import { fetchCommunityAreas } from '@/api/chicago';
import { useCache } from './useCache';

export function useCommunityAreas() {
  // Estado reativo
  const communityAreas = ref<CommunityArea[]>([]) as Ref<CommunityArea[]>;
  const selectedArea = ref<string | null>(null); // area_numbe da área selecionada
  const loading = ref(false);
  const error = ref<Error | null>(null);
  
  // Cache
  const cache = useCache();

  /**
   * Busca Community Areas da API (com cache)
   */
  async function loadCommunityAreas(): Promise<void> {
    // Tentar cache primeiro
    const cached = cache.get<CommunityArea[]>('COMMUNITY_AREAS', 'all');
    if (cached) {
      communityAreas.value = cached;
      console.log(`Loaded ${cached.length} Community Areas from cache`);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await fetchCommunityAreas();
      communityAreas.value = data;
      console.log(`Loaded ${data.length} Community Areas`);
      
      // Cachear resultado
      cache.set('COMMUNITY_AREAS', 'all', data);
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      console.error('Failed to load community areas:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Seleciona uma Community Area (acionado pelo click no mapa)
   * 
   * @param areaNumber - Número da Community Area (1-77)
   */
  function selectArea(areaNumber: string | null): void {
    selectedArea.value = areaNumber;
    console.log('Selected Community Area:', areaNumber);
  }

  /**
   * Retorna dados da área atualmente selecionada
   * IMPORTANTE: A agregação completa (parques, waterways) será feita
   * por composables injetados no componente pai
   */
  const selectedAreaObject = computed<CommunityArea | null>(() => {
    if (!selectedArea.value) return null;

    return (
      communityAreas.value.find((a) => a.area_numbe === selectedArea.value) || null
    );
  });

  /**
   * Helper para construir SelectedAreaData completo
   * Este método deve ser chamado pelo componente pai com dados agregados
   */
  function buildSelectedAreaData(
    parks: any[],
    waterways: any[],
    totalAcres: number,
    isochroneAnalysis?: any
  ): SelectedAreaData | null {
    const area = selectedAreaObject.value;
    if (!area) return null;

    return {
      area,
      parks,
      totalParkAcres: totalAcres,
      parkCount: parks.length,
      nearbyWaterways: waterways,
      isochroneAnalysis,
    };
  }

  return {
    // Estado
    communityAreas,
    selectedArea,
    selectedAreaObject,
    loading,
    error,

    // Métodos
    loadCommunityAreas,
    selectArea,
    buildSelectedAreaData,
  };
}
