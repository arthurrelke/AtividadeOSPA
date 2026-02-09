<script setup lang="ts">
/**
 * PopupAnalysis.vue
 * 
 * Popup de análise imobiliária exibido ao clicar em um lote (parcel)
 * 
 * CORE DO PROJETO: Real Estate Feasibility Analysis
 * 
 * Estados:
 * 1. Fora de zona de valorização (👎)
 * 2. Dentro de zona de valorização (👍) + simulação financeira
 */

import { computed } from 'vue';
import type { ParcelAnalysisResult } from '@/composables/useParcelAnalysis';

interface Props {
  analysis: ParcelAnalysisResult | null;
  loading: boolean;
  error: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

/**
 * Formata distância para exibição
 */
const formattedDistance = computed(() => {
  if (!props.analysis?.nearestAsset) return '';
  return props.analysis.nearestAsset.distanceMiles.toFixed(2);
});

/**
 * Formata valores monetários
 */
function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

/**
 * Calcula largura da barra de valorização (CSS)
 */
const valuationBarWidth = computed(() => {
  if (!props.analysis?.valuation) return '0%';
  const { baseValue, valuatedValue } = props.analysis.valuation;
  const percentage = ((valuatedValue - baseValue) / baseValue) * 100;
  return `${percentage}%`;
});
</script>

<template>
  <div 
    v-if="analysis || loading || error"
    class="
      fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
      bg-chi-sidebar border border-white/10 rounded-lg shadow-2xl
      p-6 max-w-md w-full z-50
    "
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-100">
        Análise de Lote
      </h3>
      <button
        @click="emit('close')"
        class="
          text-gray-400 hover:text-gray-100
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-chi-accent/50
          rounded p-1
        "
        aria-label="Fechar"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-3 animate-pulse">
      <div class="h-4 bg-white/10 rounded w-3/4"></div>
      <div class="h-4 bg-white/10 rounded w-full"></div>
      <div class="h-20 bg-white/10 rounded"></div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="text-center py-4">
      <p class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- Estado 1: Fora de zona de valorização -->
    <div 
      v-else-if="analysis && !analysis.isInValuationZone"
      class="text-center py-4 space-y-3"
    >
      <div class="text-5xl">👎</div>
      <p class="text-gray-300">
        Este lote <strong>NÃO</strong> está dentro de uma zona de valorização associada a parques.
      </p>
      <p class="text-sm text-gray-400 italic">
        Oops! Clique em um lote dentro das zonas de valorização para ver a análise.
      </p>
    </div>

    <!-- Estado 2: Dentro de zona de valorização -->
    <div 
      v-else-if="analysis && analysis.isInValuationZone && analysis.valuation"
      class="space-y-4"
    >
      <!-- Emoji + Título -->
      <div class="flex items-center gap-3">
        <div class="text-4xl">👍</div>
        <div>
          <h4 class="text-chi-action font-semibold">Zona de Valorização Identificada</h4>
          <p class="text-xs text-gray-400">Parque</p>
        </div>
      </div>

      <!-- Informações de proximidade -->
      <div class="bg-white/5 p-3 rounded-lg space-y-1">
        <p class="text-sm text-gray-300">
          Este lote está a <strong class="text-chi-action">{{ formattedDistance }} milhas</strong> 
          do parque mais próximo
          <strong class="text-gray-100">({{ analysis.nearestAsset?.name }})</strong>,
        </p>
        <p class="text-sm text-gray-300">
          o que indica um potencial de valorização de 
          <strong class="text-chi-action text-lg">+{{ analysis.valuation.premium }}%</strong>.
        </p>
      </div>

      <!-- Simulação Financeira -->
      <div class="space-y-2">
        <h5 class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Simulação Financeira (valores fictícios)
        </h5>
        
        <!-- Valores -->
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-400">Valor base:</span>
          <span class="text-gray-100 font-semibold">{{ formatCurrency(analysis.valuation.baseValue) }}</span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-gray-400">Valor valorizado:</span>
          <span class="text-chi-action font-semibold text-lg">{{ formatCurrency(analysis.valuation.valuatedValue) }}</span>
        </div>

        <!-- Gráfico de barras CSS puro -->
        <div class="space-y-1 pt-2">
          <!-- Barra esquerda (base) -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400 w-16">Base</span>
            <div class="flex-1 h-6 bg-blue-400/30 rounded relative overflow-hidden">
              <div class="absolute inset-0 bg-blue-400/50"></div>
            </div>
          </div>
          
          <!-- Barra direita (valorizado) -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400 w-16">Valorizado</span>
            <div class="flex-1 h-6 bg-blue-400/30 rounded relative overflow-hidden">
              <div 
                class="absolute inset-0 bg-chi-action transition-all duration-500"
                :style="{ width: `calc(100% + ${valuationBarWidth})` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé: Link para metodologia -->
      <div class="pt-3 border-t border-white/10">
        <p class="text-xs text-gray-400">
          Gostaria de entender a metodologia?
        </p>
        <a
          href="https://housingstudies.org/releases/measuring-impact-606/"
          target="_blank"
          rel="noopener noreferrer"
          class="
            text-sm text-chi-action hover:text-chi-accent
            transition-colors underline
            inline-flex items-center gap-1 mt-1
          "
        >
          DePaul University – Measuring the Impact of The 606
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  </div>

  <!-- Backdrop -->
  <div
    v-if="analysis || loading || error"
    class="fixed inset-0 bg-black/50 z-40"
    @click="emit('close')"
  ></div>
</template>

<style scoped>
/* Animação suave para a barra de valorização */
</style>
