<script setup lang="ts">
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import type { ViewMode } from '../core/SolarScene'

interface Props {
  isPlaying: boolean
  timeSpeed: number
  viewMode: ViewMode
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'togglePlay'): void
  (e: 'changeSpeed', speed: number): void
  (e: 'changeViewMode', mode: ViewMode): void
}>()

const speedOptions = [
  { label: '0.25x', value: 0.25 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '10x', value: 10 },
  { label: '50x', value: 50 }
]

const viewModeOptions = [
  { label: 'Визуальный', value: 'visual' as ViewMode },
  { label: 'Реалистичный', value: 'realistic' as ViewMode }
]

const onSpeedChange = (val: number | null) => {
  if (val !== null && val !== undefined) {
    emit('changeSpeed', val)
  }
}

const onViewModeChange = (val: ViewMode | null) => {
  if (val) {
    emit('changeViewMode', val)
  }
}
</script>

<template>
  <div class="time-controls-panel glass-panel">
    <!-- Play / Pause Button -->
    <div class="section-group">
      <Button
        :icon="isPlaying ? 'pi pi-pause' : 'pi pi-play'"
        :label="isPlaying ? 'Пауза' : 'Старт'"
        severity="secondary"
        size="small"
        class="play-btn"
        :class="{ 'btn-playing': isPlaying }"
        @click="emit('togglePlay')"
      />
    </div>

    <div class="divider"></div>

    <!-- Speed Selector using PrimeVue SelectButton -->
    <div class="section-group speed-group">
      <span class="group-label">Скорость:</span>
      <SelectButton
        :model-value="timeSpeed"
        :options="speedOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        class="compact-selectbutton"
        @update:model-value="onSpeedChange"
      />
    </div>

    <div class="divider"></div>

    <!-- Scale Mode Toggle using PrimeVue SelectButton -->
    <div class="section-group mode-group">
      <span class="group-label">Масштаб:</span>
      <SelectButton
        :model-value="viewMode"
        :options="viewModeOptions"
        option-label="label"
        option-value="value"
        :allow-empty="false"
        size="small"
        class="compact-selectbutton"
        @update:model-value="onViewModeChange"
      />
    </div>
  </div>
</template>

<style scoped>
.time-controls-panel {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 8px 16px;
  border-radius: var(--radius-lg);
  z-index: 15;
  user-select: none;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--space-surface-panel-border);
}

.section-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.group-label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--space-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.play-btn {
  font-family: var(--font-mono);
  font-size: 12px;
  transition: all 0.2s ease-in-out;
}

.btn-playing {
  border-color: var(--space-accent-cyan-border) !important;
  color: var(--space-accent-cyan) !important;
}

:deep(.compact-selectbutton .p-togglebutton) {
  font-family: var(--font-mono);
  font-size: 11.5px;
  padding: 4px 10px;
}

@media (max-width: 768px) {
  .time-controls-panel {
    bottom: 16px;
    flex-wrap: wrap;
    justify-content: center;
    width: 90%;
    max-width: 440px;
    gap: 8px;
    padding: 10px;
  }
  .divider {
    display: none;
  }
}
</style>
