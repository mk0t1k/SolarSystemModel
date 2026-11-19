<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import { SolarScene, type ViewMode } from '../core/SolarScene'
import { PLANETS_DATA, SUN_DATA, type CelestialBodyData } from '../data/celestialBodies'
import { filterCelestialBodies } from '../utils/celestialFilter'
import type { HoverEventPayload } from '../core/RaycasterManager'
import PlanetCard from './PlanetCard.vue'
import TimeControls from './TimeControls.vue'
import AstronomicalEventsPanel from './AstronomicalEventsPanel.vue'

const containerRef = ref<HTMLDivElement | null>(null)
// В соответствии с style-guide.md Three.js инстанс SolarScene оборачивается в shallowRef или чистую переменную
const solarSceneRef = shallowRef<SolarScene | null>(null)

const isPlaying = ref(true)
const timeSpeed = ref(1.0)
const viewMode = ref<ViewMode>('visual')
const selectedBody = ref<CelestialBodyData | null>(null)
const searchQuery = ref('')
const isPlannerOpen = ref(false)

const allBodies: CelestialBodyData[] = [SUN_DATA, ...PLANETS_DATA]

const filteredBodies = computed(() => {
  return filterCelestialBodies(allBodies, searchQuery.value)
})

// Тултип при hover
const tooltipData = ref<{
  visible: boolean
  name: string
  russianName: string
  x: number
  y: number
}>({
  visible: false,
  name: '',
  russianName: '',
  x: 0,
  y: 0
})

const handleHover = (payload: HoverEventPayload) => {
  if (payload.body) {
    tooltipData.value = {
      visible: true,
      name: payload.body.name,
      russianName: payload.body.russianName,
      x: payload.screenX,
      y: payload.screenY
    }
  } else {
    tooltipData.value = { 
      visible: false, 
      name: '', 
      russianName: '', 
      x: 0, 
      y: 0 
    }
  }
}

const handleSelect = (body: CelestialBodyData | null) => {
  selectedBody.value = body
}

const togglePlay = () => {
  if (!solarSceneRef.value) return
  isPlaying.value = solarSceneRef.value.toggleRunning()
}

const setSpeed = (spd: number) => {
  if (!solarSceneRef.value) return
  timeSpeed.value = spd
  solarSceneRef.value.setTimeSpeed(spd)
}

const setViewMode = (mode: ViewMode) => {
  if (!solarSceneRef.value) return
  viewMode.value = mode
  solarSceneRef.value.setViewMode(mode)
}

const handleSearchKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    searchQuery.value = ''
  } else if (event.key === 'Enter') {
    if (filteredBodies.value.length > 0) {
      selectFromList(filteredBodies.value[0])
    }
  }
}

const clearSearch = () => {
  searchQuery.value = ''
}

const selectFromList = (body: CelestialBodyData) => {
  if (!solarSceneRef.value) return
  solarSceneRef.value.selectBody(body)
}

const resetView = () => {
  if (!solarSceneRef.value) return
  solarSceneRef.value.resetView()
  selectedBody.value = null
}

const closeCard = () => {
  selectedBody.value = null
}

const togglePlanner = () => {
  isPlannerOpen.value = !isPlannerOpen.value
}

const handleTimeJump = (targetTime: number | string) => {
  const timeDays = typeof targetTime === 'string' ? parseFloat(targetTime) : targetTime
  if (!solarSceneRef.value || Number.isNaN(timeDays)) return
  solarSceneRef.value.jumpToTime(timeDays)
}

onMounted(() => {
  if (containerRef.value) {
    const scene = new SolarScene(containerRef.value)
    solarSceneRef.value = scene
    isPlaying.value = scene.getRunning()
    timeSpeed.value = scene.getTimeSpeed()
    viewMode.value = scene.getViewMode()

    scene.setEventCallbacks(
      payload => handleHover(payload),
      body => handleSelect(body)
    )
  }
})

onBeforeUnmount(() => {
  if (solarSceneRef.value) {
    solarSceneRef.value.destroy()
    solarSceneRef.value = null
  }
})
</script>

<template>
  <div class="viewport-wrapper">
    <!-- 3D WebGL Canvas Container -->
    <div ref="containerRef" class="canvas-container"></div>

    <!-- UI Overlay: Top Brand Bar -->
    <header class="top-brand-bar">
      <div class="brand-tag glass-panel">
        <span class="pulse-indicator"></span>
        <span class="brand-title">SOLAR SYSTEM 3D</span>
      </div>

      <!-- Search & Nav for celestial bodies -->
      <div class="nav-container">
        <div class="search-box glass-panel">
          <i class="pi pi-search search-icon"></i>
          <InputText
            v-model="searchQuery"
            type="text"
            size="small"
            class="search-input"
            placeholder="Поиск планеты / Search..."
            @keydown="handleSearchKeydown"
          />
          <Button
            v-if="searchQuery"
            icon="pi pi-times"
            text
            rounded
            size="small"
            class="clear-search-btn"
            title="Очистить"
            @click="clearSearch"
          />
        </div>

        <nav class="quick-nav glass-panel">
          <Button
            v-for="body in filteredBodies"
            :key="body.id"
            :label="body.russianName"
            size="small"
            text
            class="quick-pill"
            :class="{
              'sun-pill': body.id === SUN_DATA.id,
              active: selectedBody?.id === body.id
            }"
            @click="selectFromList(body)"
          />
          <span v-if="filteredBodies.length === 0" class="empty-results">
            Ничего не найдено
          </span>
        </nav>
      </div>

      <div class="top-actions">
        <Button
          label="События"
          icon="pi pi-calendar"
          size="small"
          severity="secondary"
          class="events-toggle-btn glass-panel"
          :class="{ active: isPlannerOpen }"
          title="Планетарные события"
          @click="togglePlanner"
        />

        <Button
          v-if="selectedBody"
          label="Общий вид"
          icon="pi pi-compass"
          size="small"
          severity="info"
          class="reset-view-btn"
          @click="resetView"
        />
      </div>
    </header>

    <!-- Interactive Tooltip (Raycasting Hover) -->
    <div
      v-if="tooltipData.visible"
      class="celestial-tooltip glass-panel"
      :style="{ left: `${tooltipData.x + 14}px`, top: `${tooltipData.y + 14}px` }"
    >
      <span class="tooltip-ru">{{ tooltipData.russianName }}</span>
      <span class="tooltip-en">{{ tooltipData.name }}</span>
    </div>

    <!-- Planet Information Card (Feature B) -->
    <PlanetCard
      :body="selectedBody"
      @close="closeCard"
      @reset-view="resetView"
    />

    <!-- Astronomical Events Planner Panel -->
    <AstronomicalEventsPanel
      v-if="isPlannerOpen"
      :available-planets="PLANETS_DATA"
      @close="isPlannerOpen = false"
      @time-jump="handleTimeJump"
    />

    <!-- Time and View Mode Controls (Feature B) -->
    <TimeControls
      :is-playing="isPlaying"
      :time-speed="timeSpeed"
      :view-mode="viewMode"
      @toggle-play="togglePlay"
      @change-speed="setSpeed"
      @change-view-mode="setViewMode"
    />
  </div>
</template>

<style scoped>
.viewport-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--space-bg-darkest);
}

.canvas-container {
  width: 100%;
  height: 100%;
  display: block;
}

.top-brand-bar {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  pointer-events: none;
  z-index: 10;
}

.brand-tag {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 8px 16px;
  border-radius: var(--radius-lg);
}

.pulse-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--space-accent-cyan);
  box-shadow: 0 0 10px var(--space-accent-cyan);
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.brand-title {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--space-text-secondary);
}

.nav-container {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 70%;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-lg);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-box:focus-within {
  border-color: var(--space-accent-cyan-border) !important;
  box-shadow: 0 0 10px rgba(0, 255, 204, 0.2) !important;
}

.search-icon {
  font-size: 13px;
  color: var(--space-text-muted);
}

.search-input {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--space-text-primary) !important;
  font-family: var(--font-mono);
  font-size: 12px;
  width: 150px;
  padding: 4px 6px;
  transition: width 0.2s ease;
}

.search-input:focus {
  width: 190px;
}

.search-input::placeholder {
  color: var(--space-text-disabled);
  font-size: 11px;
}

.clear-search-btn {
  width: 22px !important;
  height: 22px !important;
  padding: 0 !important;
  color: var(--space-text-muted) !important;
}

.clear-search-btn:hover {
  color: var(--space-text-primary) !important;
}

.empty-results {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: #ff6b6b;
  padding: 4px 8px;
  white-space: nowrap;
}

.quick-nav {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-lg);
  overflow-x: auto;
  max-width: 100%;
}

.quick-pill {
  padding: 4px 8px !important;
  font-size: 11.5px !important;
  font-family: var(--font-mono);
  color: var(--space-text-muted) !important;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.quick-pill:hover {
  color: var(--space-text-primary) !important;
  background: var(--space-surface-subtle-hover) !important;
}

.quick-pill.active {
  color: var(--space-accent-cyan) !important;
  background: var(--space-accent-cyan-bg) !important;
  border: 1px solid var(--space-accent-cyan-border) !important;
}

.sun-pill.active {
  color: var(--space-accent-gold) !important;
  background: rgba(255, 170, 0, 0.15) !important;
  border-color: rgba(255, 170, 0, 0.5) !important;
}

.top-actions {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.events-toggle-btn {
  font-family: var(--font-mono);
  font-size: 12px;
  transition: all 0.2s ease;
}

.events-toggle-btn.active {
  background: var(--space-accent-cyan-bg) !important;
  border-color: var(--space-accent-cyan) !important;
  color: var(--space-accent-cyan) !important;
  box-shadow: var(--space-shadow-accent) !important;
}

.reset-view-btn {
  font-family: var(--font-mono);
  font-size: 12px;
}

/* Tooltip */
.celestial-tooltip {
  position: fixed;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  z-index: 100;
}

.tooltip-ru {
  font-size: 12px;
  font-weight: 600;
  color: var(--space-text-primary);
}

.tooltip-en {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--space-accent-cyan);
}

@media (max-width: 992px) {
  .top-brand-bar {
    flex-wrap: wrap;
  }
  .nav-container {
    max-width: 100%;
    order: 3;
    width: 100%;
  }
  .quick-nav {
    display: none;
  }
}
</style>
