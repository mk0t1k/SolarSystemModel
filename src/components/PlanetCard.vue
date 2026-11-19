<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import type { CelestialBodyData } from '../data/celestialBodies'

interface Props {
  body: CelestialBodyData | null
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'resetView'): void
}>()
</script>

<template>
  <Transition name="slide-card">
    <Card v-if="body" class="planet-card glass-card">
      <template #header>
        <div class="card-header">
          <div class="header-titles">
            <Tag :value="body.typeName" severity="info" class="type-tag" />
            <h2 class="body-title">{{ body.russianName }}</h2>
            <span class="body-latin">{{ body.name }}</span>
          </div>
          <Button
            icon="pi pi-times"
            text
            rounded
            severity="secondary"
            aria-label="Закрыть карточку"
            size="small"
            class="close-btn"
            @click="emit('close')"
          />
        </div>
      </template>

      <template #content>
        <div class="card-content-wrap">
          <div class="params-grid">
            <div class="param-item">
              <span class="param-label">Радиус</span>
              <span class="param-value">{{ body.realRadiusKm.toLocaleString('ru-RU') }} км</span>
            </div>

            <div class="param-item">
              <span class="param-label">Дистанция от Солнца</span>
              <span class="param-value">
                {{ body.realDistanceMillionKm > 0 ? `${body.realDistanceMillionKm} млн км` : 'Центр системы' }}
              </span>
            </div>

            <div class="param-item">
              <span class="param-label">Период обращения</span>
              <span class="param-value">
                {{ body.id === 'sun' ? '—' : `${body.orbitalPeriod} дн.` }}
              </span>
            </div>

            <div class="param-item">
              <span class="param-label">Масса</span>
              <span class="param-value mass-value">{{ body.massKg }}</span>
            </div>
          </div>

          <div class="facts-section">
            <h3 class="facts-title">Интересные факты</h3>
            <ul class="facts-list">
              <li v-for="(fact, index) in body.interestingFacts" :key="index" class="fact-item">
                {{ fact }}
              </li>
            </ul>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="card-footer-wrap">
          <Button
            label="Сбросить вид системы"
            icon="pi pi-compass"
            severity="info"
            outlined
            class="reset-btn"
            @click="emit('resetView')"
          />
        </div>
      </template>
    </Card>
  </Transition>
</template>

<style scoped>
.planet-card {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 360px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 40px);
  border-radius: var(--radius-xl);
  z-index: 20;
  overflow: hidden;
  user-select: none;
}

:deep(.p-card-body) {
  padding: 0;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
  border-bottom: 1px solid var(--space-surface-panel-border);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.type-tag {
  align-self: flex-start;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.5px;
}

.body-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--space-text-primary);
}

.body-latin {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--space-text-muted);
}

.close-btn {
  color: var(--space-text-muted) !important;
}

.close-btn:hover {
  color: var(--space-text-primary) !important;
}

.card-content-wrap {
  padding: var(--spacing-md) var(--spacing-lg);
  overflow-y: auto;
  max-height: calc(100vh - 220px);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: var(--space-surface-subtle);
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.param-label {
  font-size: 11px;
  color: var(--space-text-muted);
}

.param-value {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--space-accent-blue);
}

.mass-value {
  font-size: 11px;
  line-height: 1.3;
}

.facts-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.facts-title {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--space-text-secondary);
  margin: 0;
}

.facts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.fact-item {
  position: relative;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--space-text-secondary);
  padding-left: 14px;
}

.fact-item::before {
  content: '•';
  position: absolute;
  left: 2px;
  color: var(--space-accent-cyan);
}

.card-footer-wrap {
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--space-surface-panel-border);
}

.reset-btn {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 12px;
}

/* Glassmorphism Slide Transition */
.slide-card-enter-active,
.slide-card-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-card-enter-from,
.slide-card-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>
