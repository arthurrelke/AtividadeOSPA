<script setup lang="ts">
/**
 * SkeletonLoader.vue
 * 
 * Componente genérico de skeleton loading
 * Usado durante fetch de dados para melhorar perceived performance
 */

interface Props {
  type?: 'text' | 'card' | 'metric' | 'full';
  lines?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  lines: 3,
});
</script>

<template>
  <!-- Skeleton para texto (múltiplas linhas) -->
  <div v-if="type === 'text'" class="space-y-3 animate-pulse">
    <div
      v-for="i in lines"
      :key="i"
      class="h-4 bg-white/10 rounded"
      :class="[
        i === lines ? 'w-2/3' : 'w-full'
      ]"
    />
  </div>

  <!-- Skeleton para card completo -->
  <div v-else-if="type === 'card'" class="card space-y-4 animate-pulse">
    <div class="flex items-center justify-between">
      <div class="h-6 bg-white/10 rounded w-3/4"></div>
      <div class="h-6 w-6 bg-white/10 rounded"></div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div class="h-20 bg-white/10 rounded"></div>
      <div class="h-20 bg-white/10 rounded"></div>
    </div>
    <div class="h-4 bg-white/10 rounded w-full"></div>
    <div class="h-4 bg-white/10 rounded w-5/6"></div>
    <div class="h-24 bg-white/10 rounded"></div>
  </div>

  <!-- Skeleton para métricas -->
  <div v-else-if="type === 'metric'" class="animate-pulse">
    <div class="h-3 bg-white/10 rounded w-1/2 mb-2"></div>
    <div class="h-8 bg-white/10 rounded w-3/4"></div>
  </div>

  <!-- Skeleton full (sidebar inteira) -->
  <div v-else-if="type === 'full'" class="space-y-6 animate-pulse p-6">
    <!-- Layer toggles -->
    <div class="space-y-2">
      <div class="h-4 bg-white/10 rounded w-1/3 mb-3"></div>
      <div class="h-12 bg-white/10 rounded"></div>
      <div class="h-12 bg-white/10 rounded"></div>
      <div class="h-12 bg-white/10 rounded"></div>
    </div>

    <!-- Divider -->
    <div class="h-px bg-white/10"></div>

    <!-- Analysis section -->
    <div class="space-y-4">
      <div class="h-4 bg-white/10 rounded w-1/2"></div>
      <div class="card space-y-4">
        <div class="h-6 bg-white/10 rounded w-3/4"></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="h-20 bg-white/10 rounded"></div>
          <div class="h-20 bg-white/10 rounded"></div>
        </div>
        <div class="h-32 bg-white/10 rounded"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Animação pulse já vem do Tailwind */
</style>
