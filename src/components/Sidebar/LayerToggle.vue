<script setup lang="ts">
/**
 * LayerToggle.vue
 * 
 * Componente para toggle de visibilidade de camadas do mapa
 * 
 * Usado dentro da Sidebar para controlar:
 * - Community Areas
 * - Parks
 * - Park Valuation Buffers
 */

import { computed } from 'vue';
import type { LayerConfig } from '@/types';
import { useI18n } from '@/i18n';

// Props
interface Props {
  layer: LayerConfig;
}

const props = defineProps<Props>();

const { t } = useI18n();

const layerLabel = computed(() => {
  const key = `layers.${props.layer.id}`;
  const translated = t(key);
  return translated === key ? props.layer.name : translated;
});

// Emits
const emit = defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <button
    :data-tutorial="layer.id === 'park-buffers' ? 'buffers' : undefined"
    @click="emit('toggle')"
    class="
      w-full flex items-center justify-between
      p-3 rounded-lg
      bg-chi-sidebar/50 hover:bg-white/5
      border border-white/10
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-chi-accent/50
    "
    :aria-label="t('layers.toggleAria', { layer: layerLabel })"
  >
    <div class="flex items-center space-x-3">
      <!-- Indicador de cor da camada -->
      <div
        class="w-4 h-4 rounded border border-white/20"
        :style="{ backgroundColor: layer.color }"
        aria-hidden="true"
      />

      <!-- Nome da camada -->
      <span class="text-sm font-medium text-gray-200">
        {{ layerLabel }}
      </span>
    </div>

    <!-- Toggle switch visual -->
    <div
      class="
        relative w-11 h-6 rounded-full
        transition-colors duration-200
      "
      :class="[
        layer.visible ? 'bg-chi-accent' : 'bg-gray-700'
      ]"
    >
      <div
        class="
          absolute top-0.5 left-0.5
          w-5 h-5 rounded-full bg-white
          transition-transform duration-200
          shadow-sm
        "
        :class="[
          layer.visible ? 'translate-x-5' : 'translate-x-0'
        ]"
      />
    </div>
  </button>
</template>

<style scoped>
/* Toggle animado via Tailwind classes acima */
</style>
