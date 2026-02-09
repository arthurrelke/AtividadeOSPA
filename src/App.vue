<script setup lang="ts">
/**
 * App.vue
 * 
 * Componente raiz da aplicação
 * 
 * Orquestra:
 * - Composables (dados)
 * - Componentes (mapa + sidebar)
 * - Estado global da aplicação
 * 
 * Layout: Sidebar (direita) + Mapa (fill restante)
 */

import { onMounted, computed } from 'vue';
import CityMap from './components/Map/CityMap.vue';
import Sidebar from './components/Sidebar/Sidebar.vue';
import TutorialOverlay from './components/Tutorial/TutorialOverlay.vue';

// Composables
import { useParks } from './composables/useParks';
import { useCommunityAreas } from './composables/useCommunityAreas';
import { useMapLayers } from './composables/useMapLayers';
import { useIsochroneAnalysis } from './composables/useIsochroneAnalysis';
import { useValuationBuffers } from './composables/useValuationBuffers';
import { validateAPIConnection } from './api/validator';

// Inicializa composables
const { 
  parks, 
  loading: parksLoading, 
  loadParks, 
  getParksByArea,
  getTotalParkAcresByArea,
} = useParks();



const { 
  communityAreas, 
  selectedArea, 
  selectedAreaObject,
  loading: areasLoading, 
  loadCommunityAreas,
  selectArea,
  buildSelectedAreaData,
} = useCommunityAreas();

const { layers, toggleLayer } = useMapLayers();

const { analyzeIsochrone } = useIsochroneAnalysis();

// Buffers de valorização
const { 
  buffers: valuationBuffers,
  generateAllBuffers,
} = useValuationBuffers();

// Estado de loading global
const isLoading = computed(() => {
  return parksLoading.value || areasLoading.value;
});

// Computed para dados agregados da área selecionada
const selectedAreaData = computed(() => {
  const area = selectedAreaObject.value;
  if (!area) return null;

  // Agregar dados usando composables com cálculos geométricos
  const areaParks = getParksByArea(area);
  const totalAcres = getTotalParkAcresByArea(area);
  
  // Análise de cobertura: % da Community Area fora do buffer de 0.2 milhas
  // Usa buffers globais (parques dentro e fora da área)
  const isochroneData = analyzeIsochrone(area, valuationBuffers.value);

  return buildSelectedAreaData(areaParks, [], totalAcres, isochroneData);
});

// Mapeamento de visibilidade de camadas para o mapa
const layerVisibility = computed(() => {
  const visibility: Record<string, boolean> = {};
  layers.value.forEach(layer => {
    visibility[layer.id] = layer.visible;
  });
  return visibility;
});

/**
 * Carrega todos os dados ao montar o componente
 */
onMounted(async () => {
  console.log('=== APP MOUNTED ===');
  
  // Validar conexão com API antes de carregar dados
  console.log('🔍 Validating API connection...');
  const apiStatus = await validateAPIConnection();
  
  if (apiStatus.connected) {
    console.log(`✅ API Connected - Response time: ${apiStatus.responseTime}ms`);
  } else {
    console.warn(`⚠️ API Connection Issue: ${apiStatus.error}`);
    console.warn('App will continue with cached/local data if available');
  }
  
  // Limpar cache antigo (evitar QuotaExceededError)
  try {
    const keysToRemove = ['chicago-parks:PARKS:all', 'chicago-parks:WATERWAYS:all', 'chicago-parks:VALUATION_BUFFERS:all'];
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🧹 Removed old cache: ${key}`);
      }
    });
  } catch (err) {
    console.warn('Failed to clear old cache:', err);
  }
  
  // Carrega dados em paralelo
  await Promise.all([
    loadParks(),
    loadCommunityAreas(),
  ]);

  console.log('All data loaded:');
  console.log('- Parks:', parks.value.length);
  console.log('- Community Areas:', communityAreas.value.length);

  // Gerar buffers de valorização após carregar parks
  if (parks.value.length > 0) {
    console.log('Generating valuation buffers...');
    generateAllBuffers(parks.value);
    console.log('Valuation buffers:', valuationBuffers.value.length);
  } else {
    console.warn('No parks loaded - skipping buffer generation');
  }
});

/**
 * Handler para click em Community Area no mapa
 */
function handleAreaClick(areaNumber: string): void {
  selectArea(areaNumber);
}

/**
 * Handler para limpar seleção
 */
function handleClearSelection(): void {
  selectArea(null);
}

/**
 * Handler para toggle de camadas
 */
function handleToggleLayer(layerId: string): void {
  toggleLayer(layerId);
}
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden">
    <!-- Sidebar (dominante - o produto) à ESQUERDA -->
    <Sidebar
      :selected-area="selectedAreaData"
      :layers="layers"
      :loading="isLoading"
      @toggle-layer="handleToggleLayer"
      @clear-selection="handleClearSelection"
    />
    <!-- Mapa (fill - contexto espacial) -->
    <main class="flex-1 relative">
      <CityMap
        :parks="parks"
        :community-areas="communityAreas"
        :valuation-buffers="valuationBuffers"
        :selected-area="selectedArea"
        :layer-visibility="layerVisibility"
        @area-click="handleAreaClick"
      />
    </main>  </div>

  <TutorialOverlay />
</template>

<style>
/* Estilos globais já importados via main.ts */
</style>
