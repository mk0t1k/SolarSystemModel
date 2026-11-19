<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import SelectButton from 'primevue/selectbutton'
import ToggleButton from 'primevue/togglebutton'
import InputNumber from 'primevue/inputnumber'
import Card from 'primevue/card'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'

import type { EventType, PlannerUIState, EventSearchParams, EventSearchResult } from '../core/astronomicalEvents'
import type { CelestialBodyData } from '../data/celestialBodies'
import { searchPlanetaryEvents } from '../api/planetaryEventsApi'

interface Props {
  currentSimulationTime?: number
  availablePlanets: CelestialBodyData[]
}

const props = withDefaults(defineProps<Props>(), {
  currentSimulationTime: 0
})

const emit = defineEmits<{
  (e: 'search', params: EventSearchParams): void
  (e: 'time-jump', targetTime: number | string): void
  (e: 'close'): void
}>()

// Filter available planets excluding the Sun
const selectablePlanets = computed(() => {
  return props.availablePlanets.filter(b => b.id !== 'sun')
})

const eventTypeOptions: Array<{ label: string; value: EventType }> = [
  { label: 'Соединение', value: 'conjunction' },
  { label: 'Противостояние', value: 'opposition' },
  { label: 'Парад планет', value: 'parade' }
]

const uiState = ref<PlannerUIState>('Idle')
const selectedEventType = ref<EventType>('conjunction')
const selectedPlanetIds = ref<string[]>(['earth', 'mars'])
const timeRangeDays = ref<number | null>(800)
const lastResult = ref<EventSearchResult | null>(null)
const errorMessage = ref<string>('')

// Validation states
const hasSubmitted = ref(false)

const minRequiredPlanets = computed(() => {
  return selectedEventType.value === 'parade' ? 3 : 2
})

const isPlanetCountValid = computed(() => {
  return selectedPlanetIds.value.length >= minRequiredPlanets.value
})

const isTimeRangeValid = computed(() => {
  const val = timeRangeDays.value
  return val !== null && val !== undefined && !Number.isNaN(val) && val >= 1 && val <= 3650
})

const planetCountError = computed(() => {
  if (!hasSubmitted.value) return ''
  if (!isPlanetCountValid.value) {
    return minRequiredPlanets.value === 3
      ? 'Выберите минимум 3 планеты для парада планет'
      : 'Выберите минимум 2 планеты для расчёта'
  }
  return ''
})

const timeRangeError = computed(() => {
  if (!hasSubmitted.value) return ''
  if (!isTimeRangeValid.value) {
    return 'Укажите горизонт прогноза от 1 до 3650 дней'
  }
  return ''
})

const isInputsDisabled = computed(() => {
  return uiState.value === 'Calculating'
})

const onEventTypeChange = (newType: EventType | null) => {
  if (isInputsDisabled.value || !newType) return
  selectedEventType.value = newType

  // Auto-adjust default selections if needed
  if (newType === 'parade' && selectedPlanetIds.value.length < 3) {
    selectedPlanetIds.value = ['venus', 'earth', 'mars']
  } else if ((newType === 'conjunction' || newType === 'opposition') && selectedPlanetIds.value.length < 2) {
    selectedPlanetIds.value = ['earth', 'mars']
  }
}

const isPlanetSelected = (planetId: string) => {
  return selectedPlanetIds.value.includes(planetId)
}

const onPlanetToggle = (planetId: string, isChecked: boolean) => {
  if (isInputsDisabled.value) return
  const current = [...selectedPlanetIds.value]
  const idx = current.indexOf(planetId)

  if (isChecked && idx === -1) {
    current.push(planetId)
  } else if (!isChecked && idx !== -1) {
    current.splice(idx, 1)
  }
  selectedPlanetIds.value = current
}

const executeSearch = async () => {
  if (uiState.value === 'Calculating') return

  hasSubmitted.value = true

  // Validate before sending
  if (!isPlanetCountValid.value || !isTimeRangeValid.value) {
    return
  }

  uiState.value = 'Calculating'
  errorMessage.value = ''

  const params: EventSearchParams = {
    eventType: selectedEventType.value,
    planetIds: [...selectedPlanetIds.value],
    startTime: props.currentSimulationTime,
    timeRangeDays: Number(timeRangeDays.value)
  }

  emit('search', params)

  try {
    const res = await searchPlanetaryEvents({
      eventType: selectedEventType.value,
      planetIds: [...selectedPlanetIds.value],
      forecastDays: Number(timeRangeDays.value),
      startTime: props.currentSimulationTime
    })

    if (res.event) {
      lastResult.value = res.event
      uiState.value = 'Success'
    } else {
      lastResult.value = null
      uiState.value = 'Empty'
    }
  } catch (err: unknown) {
    uiState.value = 'Error'
    errorMessage.value = err instanceof Error ? err.message : 'Ошибка при выполнении расчёта'
  }
}

const handleTimeJump = () => {
  if (uiState.value !== 'Success' || !lastResult.value || lastResult.value.time === null) return
  emit('time-jump', lastResult.value.time)
}

const handleRetry = () => {
  errorMessage.value = ''
  executeSearch()
}

const closePanel = () => {
  emit('close')
}

const formatDisplayDate = (isoStr?: string) => {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return isoStr
  }
}

// Global keydown handler for Escape to close
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closePanel()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <aside
    class="planner-panel glass-panel"
    role="region"
    aria-label="Панель поиска планетарных событий"
  >
    <!-- Panel Header -->
    <div class="panel-header">
      <div class="title-wrap">
        <span class="header-icon" aria-hidden="true">🪐</span>
        <h2 id="planner-panel-heading" class="panel-title">Планетарные события</h2>
      </div>
      <Button
        type="button"
        icon="pi pi-times"
        text
        rounded
        severity="secondary"
        size="small"
        class="close-btn"
        aria-label="Закрыть панель"
        @click="closePanel"
      />
    </div>

    <div class="panel-body">
      <!-- 1. Event Type Selector -->
      <div class="field-group">
        <label id="event-type-label" class="group-label">Тип явления</label>
        <SelectButton
          :model-value="selectedEventType"
          :options="eventTypeOptions"
          option-label="label"
          option-value="value"
          :disabled="isInputsDisabled"
          aria-labelledby="event-type-label"
          class="events-select-button"
          @update:model-value="onEventTypeChange"
        />
      </div>

      <!-- 2. Participating Planets Selection -->
      <div class="field-group">
        <div class="group-label-row">
          <label id="participants-label" class="group-label">Участники</label>
          <span class="label-hint">
            мин. {{ minRequiredPlanets }} (выбрано {{ selectedPlanetIds.length }})
          </span>
        </div>
        <div
          class="planets-toggle-grid"
          role="group"
          aria-labelledby="participants-label"
        >
          <ToggleButton
            v-for="planet in selectablePlanets"
            :key="planet.id"
            :model-value="isPlanetSelected(planet.id)"
            :disabled="isInputsDisabled"
            class="planet-toggle-btn"
            :class="{ 'is-active': isPlanetSelected(planet.id) }"
            :aria-label="planet.russianName"
            @update:model-value="(val) => onPlanetToggle(planet.id, val)"
          >
            <template #default>
              <div class="planet-btn-inner">
                <span
                  class="planet-dot"
                  :style="{ backgroundColor: `#${planet.color.toString(16).padStart(6, '0')}` }"
                  aria-hidden="true"
                ></span>
                <span class="planet-name">{{ planet.russianName }}</span>
              </div>
            </template>
          </ToggleButton>
        </div>
        <transition name="fade-fast">
          <div v-if="planetCountError" class="field-error-message" role="alert">
            <i class="pi pi-exclamation-circle error-icon-inline" aria-hidden="true"></i>
            <span>{{ planetCountError }}</span>
          </div>
        </transition>
      </div>

      <!-- 3. Forecast Range Input (InputNumber) -->
      <div class="field-group">
        <label for="time-range-input" class="group-label">Горизонт прогноза (земных дней)</label>
        <div class="input-number-wrap">
          <InputNumber
            id="time-range-input"
            v-model="timeRangeDays"
            :min="1"
            :max="3650"
            :disabled="isInputsDisabled"
            placeholder="1–3650 дней"
            class="sci-input-number"
            suffix=" дней"
            :invalid="!!timeRangeError"
            aria-describedby="time-range-help"
            @keydown.enter="executeSearch"
          />
        </div>
        <transition name="fade-fast">
          <div v-if="timeRangeError" id="time-range-help" class="field-error-message" role="alert">
            <i class="pi pi-exclamation-circle error-icon-inline" aria-hidden="true"></i>
            <span>{{ timeRangeError }}</span>
          </div>
        </transition>
      </div>

      <!-- Action Button (Найти событие) -->
      <div class="action-wrap">
        <Button
          type="button"
          :label="uiState === 'Calculating' ? 'Расчёт траекторий...' : 'Найти событие'"
          :icon="uiState === 'Calculating' ? 'pi pi-spin pi-spinner' : 'pi pi-search'"
          :loading="uiState === 'Calculating'"
          :disabled="uiState === 'Calculating'"
          class="find-event-btn"
          @click="executeSearch"
        />
      </div>

      <!-- Dynamic State Views (Loading / Success / Empty / Error) -->
      <section class="results-container" aria-live="polite">
        <!-- 1. Calculating State (Skeleton Placeholders as in load.png) -->
        <div v-if="uiState === 'Calculating'" class="state-view loading-view">
          <div class="skeleton-card glass-panel">
            <div class="skeleton-header">
              <Skeleton width="40%" height="1.2rem" class="skeleton-shimmer" />
              <Skeleton width="25%" height="1.2rem" class="skeleton-shimmer" />
            </div>
            <Skeleton width="75%" height="1.5rem" class="skeleton-shimmer mt-2" />
            <div class="skeleton-details mt-3">
              <Skeleton width="90%" height="1rem" class="skeleton-shimmer" />
              <Skeleton width="65%" height="1rem" class="skeleton-shimmer mt-2" />
            </div>
            <Skeleton width="100%" height="2.5rem" class="skeleton-shimmer mt-4" border-radius="8px" />
          </div>
        </div>

        <!-- 2. Success State (Card as in succes.png) -->
        <div v-else-if="uiState === 'Success' && lastResult" class="state-view success-view">
          <Card class="event-result-card glass-card">
            <template #title>
              <div class="success-card-header">
                <span class="badge badge-success">Найдено</span>
                <span class="angle-val">Δθ = {{ lastResult.minAngularDifferenceDeg }}°</span>
              </div>
            </template>
            <template #subtitle>
              <h3 class="event-title">{{ lastResult.title }}</h3>
            </template>
            <template #content>
              <div class="event-details">
                <div class="detail-row">
                  <span class="detail-lbl">Целевая дата:</span>
                  <span class="detail-val date-highlight">{{ formatDisplayDate(lastResult.targetDate) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-lbl">Смещение времени:</span>
                  <span class="detail-val">+{{ lastResult.time }} дн.</span>
                </div>
              </div>
            </template>
            <template #footer>
              <Button
                type="button"
                label="Показать на орбите"
                icon="pi pi-fast-forward"
                class="jump-to-orbit-btn"
                @click="handleTimeJump"
              />
            </template>
          </Card>
        </div>

        <!-- 3. Empty State (empty.png) -->
        <div v-else-if="uiState === 'Empty'" class="state-view empty-view">
          <Card class="empty-card glass-card">
            <template #content>
              <div class="empty-content">
                <i class="pi pi-compass empty-icon" aria-hidden="true"></i>
                <h4 class="empty-title">Событие не найдено</h4>
                <p class="empty-desc">
                  За указанный период таких явлений не найдено. Попробуйте увеличить горизонт прогноза.
                </p>
              </div>
            </template>
          </Card>
        </div>

        <!-- 4. Error State (error.png with PrimeVue Message) -->
        <div v-else-if="uiState === 'Error'" class="state-view error-view">
          <Message severity="error" :closable="false" class="error-banner">
            <template #icon>
              <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
            </template>
            <div class="error-message-body">
              <span class="error-text">
                {{ errorMessage || 'Произошла ошибка при вычислении планетарных орбит.' }}
              </span>
              <div class="error-action-row">
                <Button
                  type="button"
                  label="Повторить попытку"
                  icon="pi pi-refresh"
                  size="small"
                  severity="danger"
                  outlined
                  class="retry-btn"
                  @click="handleRetry"
                />
              </div>
            </div>
          </Message>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.planner-panel {
  position: absolute;
  top: 76px;
  right: 20px;
  width: 360px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  background: var(--space-surface-panel);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--space-surface-panel-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--space-shadow-panel);
  color: var(--space-text-secondary);
  z-index: 100;
  overflow: hidden;
  transition: all 0.3s ease;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(80, 140, 240, 0.2);
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  font-size: 18px;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
}

.close-btn {
  color: var(--space-text-muted) !important;
}

.close-btn:hover {
  color: #ffffff !important;
}

.panel-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.group-label {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--space-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.label-hint {
  font-size: 10.5px;
  color: var(--space-accent-blue);
  font-family: var(--font-mono);
}

/* PrimeVue SelectButton dark customization */
:deep(.events-select-button.p-selectbutton) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: rgba(0, 0, 0, 0.4);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid rgba(80, 140, 240, 0.2);
}

:deep(.events-select-button .p-togglebutton) {
  background: transparent;
  border: none;
  padding: 6px 4px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--space-text-muted);
  border-radius: 6px;
  transition: all 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: none;
}

:deep(.events-select-button .p-togglebutton:hover:not(.p-disabled)) {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

:deep(.events-select-button .p-togglebutton.p-togglebutton-checked) {
  background: rgba(0, 255, 204, 0.15) !important;
  color: #00ffcc !important;
  font-weight: 600;
  box-shadow: 0 0 8px rgba(0, 255, 204, 0.25) !important;
}

/* Planet Toggle Buttons Grid */
.planets-toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

:deep(.planet-toggle-btn.p-togglebutton) {
  background: rgba(20, 32, 54, 0.6);
  border: 1px solid rgba(80, 140, 240, 0.25);
  border-radius: 8px;
  padding: 6px 10px;
  justify-content: flex-start;
  transition: all 0.2s ease;
}

:deep(.planet-toggle-btn.p-togglebutton:hover:not(.p-disabled)) {
  background: rgba(25, 42, 70, 0.85);
  border-color: rgba(0, 255, 204, 0.5);
}

:deep(.planet-toggle-btn.p-togglebutton-checked) {
  background: rgba(0, 255, 204, 0.14) !important;
  border-color: #00ffcc !important;
  box-shadow: 0 0 8px rgba(0, 255, 204, 0.2);
}

.planet-btn-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.planet-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
}

.planet-name {
  font-size: 11.5px;
  color: #e6edf3;
  font-family: var(--font-mono);
  white-space: nowrap;
}

/* Error message under fields */
.field-error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ff6b6b;
  font-size: 11px;
  font-family: var(--font-mono);
  margin-top: 2px;
}

.error-icon-inline {
  font-size: 12px;
}

/* InputNumber customization */
.input-number-wrap {
  width: 100%;
}

:deep(.sci-input-number) {
  width: 100%;
}

:deep(.sci-input-number .p-inputtext) {
  width: 100%;
  background: rgba(20, 32, 54, 0.7);
  border: 1px solid rgba(80, 140, 240, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 8px 12px;
  transition: all 0.2s ease;
}

:deep(.sci-input-number .p-inputtext:focus) {
  border-color: #00ffcc;
  box-shadow: 0 0 10px rgba(0, 255, 204, 0.25);
}

:deep(.sci-input-number.p-invalid .p-inputtext) {
  border-color: #ff6b6b;
}

/* Hide native input number spinners in all browsers */
:deep(.sci-input-number input[type='number']::-webkit-outer-spin-button),
:deep(.sci-input-number input[type='number']::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

:deep(.sci-input-number input[type='number']) {
  -moz-appearance: textfield;
}

/* Main Action Button */
.action-wrap {
  margin-top: 4px;
}

:deep(.find-event-btn.p-button) {
  width: 100%;
  background: linear-gradient(135deg, rgba(0, 255, 204, 0.2), rgba(0, 150, 255, 0.3));
  border: 1px solid #00ffcc;
  border-radius: 8px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  font-family: var(--font-mono);
  box-shadow: 0 4px 14px rgba(0, 255, 204, 0.2);
  transition: all 0.25s ease;
}

:deep(.find-event-btn.p-button:hover:not(:disabled)) {
  background: linear-gradient(135deg, rgba(0, 255, 204, 0.35), rgba(0, 150, 255, 0.45));
  box-shadow: 0 6px 18px rgba(0, 255, 204, 0.35);
}

:deep(.find-event-btn.p-button:disabled) {
  opacity: 0.55;
  border-color: rgba(80, 140, 240, 0.3);
  box-shadow: none;
}

/* Results section */
.results-container {
  min-height: 90px;
}

.state-view {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Skeleton Loading State (load.png) */
.skeleton-card {
  padding: 14px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  background: rgba(13, 20, 36, 0.6);
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

:deep(.skeleton-shimmer.p-skeleton) {
  background-color: rgba(255, 255, 255, 0.08);
}

.mt-2 {
  margin-top: 8px;
}

.mt-3 {
  margin-top: 12px;
}

.mt-4 {
  margin-top: 16px;
}

/* Success Card (succes.png) */
:deep(.event-result-card.p-card) {
  background: rgba(13, 25, 45, 0.85);
  border: 1px solid rgba(0, 255, 204, 0.4);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 255, 204, 0.12);
}

:deep(.event-result-card .p-card-body) {
  padding: 14px;
  gap: 8px;
}

.success-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge-success {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(0, 255, 204, 0.2);
  color: #00ffcc;
  border: 1px solid rgba(0, 255, 204, 0.5);
}

.angle-val {
  font-size: 11px;
  color: #58a6ff;
  font-family: var(--font-mono);
  font-weight: 600;
}

.event-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.event-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.25);
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-family: var(--font-mono);
}

.detail-row {
  display: flex;
  justify-content: space-between;
}

.detail-lbl {
  color: var(--space-text-muted);
}

.detail-val {
  color: #ffffff;
}

.date-highlight {
  color: #00ffcc;
  font-weight: 600;
}

:deep(.jump-to-orbit-btn.p-button) {
  width: 100%;
  background: rgba(0, 255, 204, 0.16);
  border: 1px solid #00ffcc;
  border-radius: 8px;
  color: #00ffcc;
  font-size: 11.5px;
  font-family: var(--font-mono);
  font-weight: 600;
  padding: 8px;
  transition: all 0.2s ease;
}

:deep(.jump-to-orbit-btn.p-button:hover) {
  background: rgba(0, 255, 204, 0.3) !important;
  box-shadow: 0 0 12px rgba(0, 255, 204, 0.3);
}

/* Empty Card (empty.png) */
:deep(.empty-card.p-card) {
  background: rgba(30, 25, 20, 0.7);
  border: 1px solid rgba(255, 170, 0, 0.35);
  border-radius: 12px;
}

:deep(.empty-card .p-card-body) {
  padding: 16px 14px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.empty-icon {
  font-size: 26px;
  color: #ffaa00;
  margin-bottom: 2px;
}

.empty-title {
  margin: 0;
  font-size: 13px;
  color: #ffaa00;
  font-weight: 600;
}

.empty-desc {
  margin: 0;
  font-size: 11.5px;
  color: var(--space-text-secondary);
  line-height: 1.4;
}

/* Error Banner (error.png) */
:deep(.error-banner.p-message) {
  background: rgba(45, 16, 20, 0.85);
  border: 1px solid rgba(255, 90, 90, 0.5);
  border-radius: 10px;
}

.error-message-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.error-text {
  font-size: 11.5px;
  color: #ffdede;
  line-height: 1.4;
}

.error-action-row {
  display: flex;
  justify-content: flex-end;
}

:deep(.retry-btn.p-button) {
  font-size: 11px;
  font-family: var(--font-mono);
  padding: 4px 10px;
}

/* Accessibility focus-visible rules */
:deep(*:focus-visible) {
  outline: 2px solid var(--space-accent-cyan) !important;
  outline-offset: 2px !important;
}

/* Transitions */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

/* Responsiveness down to 375px */
@media (max-width: 420px) {
  .planner-panel {
    right: 8px;
    left: 8px;
    width: auto;
    max-width: calc(100vw - 16px);
    top: 68px;
  }

  .panel-body {
    padding: 12px;
    gap: 12px;
  }

  .planets-toggle-grid {
    grid-template-columns: 1fr 1fr;
    gap: 4px;
  }

  :deep(.planet-toggle-btn.p-togglebutton) {
    padding: 6px 8px;
  }

  .planet-name {
    font-size: 10.5px;
  }
}
</style>
