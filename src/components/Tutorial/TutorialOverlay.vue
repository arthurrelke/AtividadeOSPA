<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from '@/i18n';

type TutorialStep = {
  titleKey: string;
  bodyKey: string;
  target?: string;
};

const { t } = useI18n();

const isOpen = ref(false);
const started = ref(false);
const stepIndex = ref(0);

const steps: TutorialStep[] = [
  { titleKey: 'tutorial.step.1.title', bodyKey: 'tutorial.step.1.body', target: '[data-tutorial="sidebar"]' },
  { titleKey: 'tutorial.step.2.title', bodyKey: 'tutorial.step.2.body', target: '[data-tutorial="layers"]' },
  { titleKey: 'tutorial.step.3.title', bodyKey: 'tutorial.step.3.body', target: '[data-tutorial="buffers"]' },
  { titleKey: 'tutorial.step.4.title', bodyKey: 'tutorial.step.4.body', target: '[data-tutorial="language"]' },
];

const isLastStep = computed(() => stepIndex.value >= steps.length - 1);

const highlight = ref<{ top: number; left: number; width: number; height: number } | null>(null);

function dismiss(): void {
  isOpen.value = false;
  started.value = false;
  stepIndex.value = 0;
  highlight.value = null;
}

function follow(): void {
  started.value = true;
  stepIndex.value = 0;
  computeHighlight();
}

function next(): void {
  if (isLastStep.value) {
    dismiss();
    return;
  }
  stepIndex.value += 1;
  computeHighlight();
}

function computeHighlight(): void {
  const step = steps[stepIndex.value];
  if (!step?.target) {
    highlight.value = null;
    return;
  }

  const el = document.querySelector(step.target) as HTMLElement | null;
  if (!el) {
    highlight.value = null;
    return;
  }

  const rect = el.getBoundingClientRect();
  const padding = 14;
  const minWidth = 160;
  const minHeight = 56;

  const rawWidth = rect.width + padding * 2;
  const rawHeight = rect.height + padding * 2;
  const width = Math.max(rawWidth, minWidth);
  const height = Math.max(rawHeight, minHeight);

  // Expand around the element center when we apply min sizes
  const extraW = width - rawWidth;
  const extraH = height - rawHeight;

  let left = rect.left - padding - extraW / 2;
  let top = rect.top - padding - extraH / 2;

  // Clamp to viewport
  const maxLeft = Math.max(0, window.innerWidth - width);
  const maxTop = Math.max(0, window.innerHeight - height);
  left = Math.min(Math.max(0, left), maxLeft);
  top = Math.min(Math.max(0, top), maxTop);

  highlight.value = { top, left, width, height };
}

function onReflow(): void {
  if (!isOpen.value || !started.value) return;
  computeHighlight();
}

onMounted(() => {
  isOpen.value = true;
});

watch([isOpen, started, stepIndex], () => {
  if (!isOpen.value || !started.value) return;
  requestAnimationFrame(() => computeHighlight());
});

onMounted(() => {
  window.addEventListener('resize', onReflow);
  window.addEventListener('scroll', onReflow, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', onReflow);
  window.removeEventListener('scroll', onReflow, true);
});
</script>

<template>
  <teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1000]"
      aria-modal="true"
      role="dialog"
    >
      <!-- Dimmer -->
      <div class="absolute inset-0 bg-black/60" />

      <!-- Highlight box (visual only) -->
      <div
        v-if="started && highlight"
        class="absolute border border-white/20 rounded-lg pointer-events-none"
        :style="{
          top: highlight.top + 'px',
          left: highlight.left + 'px',
          width: highlight.width + 'px',
          height: highlight.height + 'px',
        }"
      />

      <!-- Card -->
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-lg bg-chi-sidebar border border-white/10 rounded-lg shadow-2xl px-5 py-4">
          <template v-if="!started">
            <div class="text-gray-100 text-base font-semibold">
              {{ t('tutorial.welcome') }}
            </div>
            <div class="mt-4 flex items-center gap-2">
              <button class="btn-action" @click="follow">
                {{ t('tutorial.follow') }}
              </button>
              <button class="btn-secondary" @click="dismiss">
                {{ t('tutorial.skip') }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="text-gray-100 text-base font-semibold">
              {{ t(steps[stepIndex].titleKey) }}
            </div>
            <div class="mt-2 text-sm text-gray-300">
              {{ t(steps[stepIndex].bodyKey) }}
            </div>

            <div class="mt-4 flex items-center justify-between gap-2">
              <button class="btn-secondary" @click="dismiss">
                {{ t('tutorial.skip') }}
              </button>
              <button class="btn-action" @click="next">
                {{ isLastStep ? t('tutorial.finish') : t('tutorial.next') }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </teleport>
</template>
