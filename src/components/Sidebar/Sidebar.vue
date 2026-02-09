<script setup lang="ts">
/**
 * Sidebar.vue
 * 
 * Componente principal da sidebar - O PRODUTO DA APLICAÇÃO
 * 
 * Responsabilidades:
 * - Exibir painel de navegação e análise
 * - Mostrar dados agregados da Community Area selecionada
 * - Toggle de camadas do mapa
 * - Responsivo (colapsável no mobile)
 * 
 * Hierarquia visual: Sidebar > Mapa
 * Background: #252525 (ligeiramente mais claro que o mapa)
 */

import { ref } from 'vue';
import type { SelectedAreaData, LayerConfig } from '@/types';
import LayerToggle from './LayerToggle.vue';
import SkeletonLoader from './SkeletonLoader.vue';
import AreaAnalysis from '../Analysis/AreaAnalysis.vue';
import { useI18n } from '@/i18n';
import ukFlag from '@/assets/flags/uk.svg';
import brFlag from '@/assets/flags/br.svg';

// Props
interface Props {
  selectedArea?: SelectedAreaData | null;
  layers?: LayerConfig[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selectedArea: null,
  layers: () => [],
  loading: false,
});

// Emits
const emit = defineEmits<{
  toggleLayer: [layerId: string];
  clearSelection: [];
}>();

// Estado local - Sidebar colapsada ou não (mobile)
const isCollapsed = ref(false);

const { t, locale, setLocale } = useI18n();

function toggleSidebar(): void {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <aside
    data-tutorial="sidebar"
    class="
      h-full bg-chi-sidebar border-r border-white/5
      flex flex-col
      transition-all duration-300 ease-in-out
      shadow-2xl
    "
    :class="[
      isCollapsed 
        ? 'w-16' 
        : 'w-full md:w-96 lg:w-[28rem] fixed md:relative z-50 md:z-auto left-0 top-0'
    ]"
    aria-label="Analysis and navigation panel"
  >
    <!-- Header da Sidebar -->
    <header class="p-6 border-b border-white/10">
      <div class="flex items-center justify-between">
        <div v-if="!isCollapsed">
          <h1 class="text-xl font-bold text-gray-100">
            {{ t('app.title') }}
          </h1>
          <p class="text-sm text-gray-400 mt-1">
            {{ t('app.subtitle') }}
          </p>
        </div>

        <!-- Botão de colapsar (mobile) -->
        <button
          @click="toggleSidebar"
          class="
            p-2 rounded-md
            hover:bg-white/10
            transition-colors
            focus:outline-none focus:ring-2 focus:ring-chi-accent/50
            sm:hidden
          "
          :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg 
            class="w-6 h-6 text-gray-300"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              v-if="!isCollapsed"
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M6 18L18 6M6 6l12 12"
            />
            <path 
              v-else
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- Conteúdo principal (scroll) -->
    <div 
      v-if="!isCollapsed"
      class="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6"
    >
      <!-- Seção: Layer Toggles -->
      <section data-tutorial="layers">
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          {{ t('sidebar.mapLayers') }}
        </h2>
        
        <!-- Loading state para layers -->
        <div v-if="loading" class="space-y-2">
          <SkeletonLoader type="text" :lines="5" />
        </div>

        <!-- Layers carregadas com hierarquia -->
        <div v-else class="space-y-1">
          <template v-for="layer in layers" :key="layer.id">
            <!-- Layer pai -->
            <LayerToggle
              v-if="!layer.parent"
              :layer="layer"
              @toggle="emit('toggleLayer', layer.id)"
            />
            
            <!-- Layers filhas (buffers) - indentadas -->
            <div 
              v-if="!layer.parent"
              class="ml-4 space-y-1 mt-1"
            >
              <LayerToggle
                v-for="childLayer in layers.filter(l => l.parent === layer.id)"
                :key="childLayer.id"
                :layer="childLayer"
                @toggle="emit('toggleLayer', childLayer.id)"
              />
            </div>
          </template>
        </div>
      </section>

      <!-- Divider -->
      <hr class="border-white/10" />

      <!-- Seção: Análise da área selecionada -->
      <section>
        <h2 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">
          {{ t('sidebar.communityAreaAnalysis') }}
        </h2>

        <!-- Estado: Nenhuma área selecionada -->
        <div 
          v-if="!selectedArea && !loading"
          class="card text-center py-8"
        >
          <svg 
            class="w-12 h-12 mx-auto text-gray-600 mb-3"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              stroke-linecap="round" 
              stroke-linejoin="round" 
              stroke-width="2" 
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p class="text-gray-400 text-sm font-semibold mb-2">
            {{ t('sidebar.empty.title') }}
          </p>
          <p class="text-gray-500 text-xs px-4">
            {{ t('sidebar.empty.desc') }}
          </p>
          <p class="text-chi-accent text-xs mt-3 italic">
            {{ t('sidebar.empty.methodology') }}
          </p>
        </div>

        <!-- Estado: Loading (Skeleton) -->
        <div 
          v-else-if="loading"
          class="space-y-4"
        >
          <SkeletonLoader type="card" />
        </div>

        <!-- Estado: Área selecionada -->
        <AreaAnalysis
          v-else-if="selectedArea"
          :area-data="selectedArea"
          @clear="emit('clearSelection')"
        />
      </section>
    </div>

    <!-- Footer (opcional - créditos) -->
    <footer 
      v-if="!isCollapsed"
      class="p-4 border-t border-white/10 text-xs text-gray-500"
    >
      <div class="flex items-center justify-between gap-3">
        <div data-tutorial="language" class="flex items-center gap-2" :aria-label="t('sidebar.language.aria')">
          <button
            type="button"
            class="px-2 py-1 rounded-md border border-white/10 hover:bg-white/5 transition-colors"
            :class="locale === 'en' ? 'bg-white/10' : ''"
            @click="setLocale('en')"
            aria-label="English"
          >
            <img
              :src="ukFlag"
              alt="United Kingdom"
              class="h-4 w-6 object-cover rounded-sm"
              loading="lazy"
              decoding="async"
            />
          </button>
          <button
            type="button"
            class="px-2 py-1 rounded-md border border-white/10 hover:bg-white/5 transition-colors"
            :class="locale === 'pt-BR' ? 'bg-white/10' : ''"
            @click="setLocale('pt-BR')"
            aria-label="Português (Brasil)"
          >
            <img
              :src="brFlag"
              alt="Brasil"
              class="h-4 w-6 object-cover rounded-sm"
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>
        <div class="text-right">
          {{ t('sidebar.footer.data') }}
        </div>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
/* Estilos específicos da sidebar */
/* Scrollbar customizada já está no style.css global */
</style>
