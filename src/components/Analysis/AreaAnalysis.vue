<script setup lang="ts">
/**
 * AreaAnalysis.vue
 * 
 * Componente de análise detalhada de uma Community Area
 * 
 * Exibe:
 * - Nome e informações básicas da área
 * - Quantidade de parques e área total
 * - Texto analítico gerado automaticamente
 * - Correlação entre espaços livres e valorização imobiliária
 * 
 * Este componente demonstra o VALOR da plataforma:
 * transformar dados em insights acionáveis para gestores públicos
 */

import { computed } from 'vue';
import type { SelectedAreaData } from '@/types';
import { useI18n } from '@/i18n';

// Props
interface Props {
  areaData: SelectedAreaData;
}

const props = defineProps<Props>();

const { t } = useI18n();

// Emits
const emit = defineEmits<{
  clear: [];
}>();

/**
 * Gera texto analítico automático baseado nos dados da área
 * 
 * Este é um dos diferenciais da plataforma:
 * Não apenas mostrar dados, mas interpretá-los
 * 
 * ATUALIZADO: Inclui análise isócrona baseada no estudo DePaul (The 606)
 */
const outsidePct = computed(() => {
  const raw = parseFloat(props.areaData.isochroneAnalysis?.lowPercentage ?? '0');
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
});

const insidePct = computed(() => {
  return Math.max(0, 100 - outsidePct.value);
});

const avgPremium = computed(() => {
  const raw = parseFloat(props.areaData.isochroneAnalysis?.avgPremium ?? '0');
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
});

const severity = computed(() => {
  const outside = outsidePct.value;
  if (outside >= 30) return { label: t('severity.critical'), color: 'text-red-300', bg: 'bg-red-500/20' };
  if (outside >= 10) return { label: t('severity.attention'), color: 'text-yellow-300', bg: 'bg-yellow-500/20' };
  return { label: t('severity.notCritical'), color: 'text-green-300', bg: 'bg-green-500/20' };
});

const premiumBarWidth = computed(() => {
  // Escala 0..22.3% (pico de 0,2mi)
  const max = 22.3;
  const pct = Math.max(0, Math.min(100, (avgPremium.value / max) * 100));
  return `${pct.toFixed(1)}%`;
});
</script>

<template>
  <div class="card space-y-4">
    <!-- Header com nome da área -->
    <div class="flex items-start justify-between">
      <div>
        <h3 class="text-lg font-bold text-gray-100">
          {{ areaData.area.community }}
        </h3>
        <p class="text-sm text-gray-400">
          {{ t('analysis.communityArea', { num: areaData.area.area_numbe }) }}
        </p>
      </div>

      <!-- Botão de fechar análise -->
      <button
        @click="emit('clear')"
        class="
          p-1.5 rounded-md
          hover:bg-white/10
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-chi-accent/50
        "
        :aria-label="t('analysis.closeAria')"
      >
        <svg 
          class="w-5 h-5 text-gray-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Análise Estratégica (gráficos) -->
    <div 
      v-if="areaData.isochroneAnalysis"
      class="p-4 bg-chi-action/10 border border-chi-action/20 rounded-lg space-y-3"
    >
      <h4 class="text-xs font-semibold text-chi-action uppercase tracking-wide flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        {{ t('analysis.strategicTitle') }}
      </h4>

      <!-- Indicador de nível -->
      <div class="flex items-center justify-between text-xs">
        <span class="text-gray-400">{{ t('analysis.level') }}</span>
        <span class="px-2 py-1 rounded" :class="severity.bg">
          <span class="font-semibold" :class="severity.color">{{ severity.label }}</span>
        </span>
      </div>

      <!-- Gráfico: cobertura dentro/fora do buffer 0,2mi -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">{{ t('analysis.coverage') }}</span>
          <span class="text-gray-300">{{ t('analysis.outside') }}: {{ outsidePct.toFixed(1) }}%</span>
        </div>
        <div class="h-3 w-full bg-white/10 rounded overflow-hidden flex">
          <div class="bg-chi-action" :style="{ width: insidePct.toFixed(1) + '%' }" />
          <div class="bg-white/10" :style="{ width: outsidePct.toFixed(1) + '%' }" />
        </div>
        <div class="flex justify-between text-[10px] text-gray-400">
          <span>{{ t('analysis.inside') }}: {{ insidePct.toFixed(1) }}%</span>
          <span>{{ t('analysis.outside') }}: {{ outsidePct.toFixed(1) }}%</span>
        </div>
      </div>

      <!-- Gráfico: prêmio médio estimado -->
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-400">{{ t('analysis.avgUplift') }}</span>
          <span class="text-gray-300">+{{ avgPremium.toFixed(1) }}%</span>
        </div>
        <div class="h-2 w-full bg-white/10 rounded overflow-hidden">
          <div class="h-full bg-chi-action" :style="{ width: premiumBarWidth }" />
        </div>
        <div class="text-[10px] text-gray-400">{{ t('analysis.methodology') }}</div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Estilos via Tailwind classes acima */
</style>

