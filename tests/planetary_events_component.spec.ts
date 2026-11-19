import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import AstronomicalEventsPanel from '../src/components/AstronomicalEventsPanel.vue'
import CanvasViewport from '../src/components/CanvasViewport.vue'
import { PLANETS_DATA } from '../src/data/celestialBodies'
import * as planetaryEventsApi from '../src/api/planetaryEventsApi'

// Mock SolarScene to avoid WebGL / Three.js requirement in jsdom
const mockSolarSceneInstance = {
  getRunning: vi.fn(() => true),
  getTimeSpeed: vi.fn(() => 1.0),
  getViewMode: vi.fn(() => 'visual'),
  setEventCallbacks: vi.fn(),
  toggleRunning: vi.fn(() => false),
  setTimeSpeed: vi.fn(),
  setViewMode: vi.fn(),
  selectBody: vi.fn(),
  resetView: vi.fn(),
  jumpToTime: vi.fn(),
  destroy: vi.fn()
}

vi.mock('../src/core/SolarScene', () => {
  function MockSolarScene() {
    return mockSolarSceneInstance
  }
  return {
    SolarScene: MockSolarScene
  }
})

describe('AstronomicalEventsPanel.vue', () => {
  const defaultMount = (props = {}) => {
    return mount(AstronomicalEventsPanel, {
      props: {
        availablePlanets: PLANETS_DATA,
        currentSimulationTime: 0,
        ...props
      },
      global: {
        plugins: [
          [
            PrimeVue,
            {
              theme: {
                preset: Aura,
                options: { darkModeSelector: '.dark' }
              }
            }
          ]
        ]
      }
    })
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Компоненты и взаимодействия', () => {
    it('отображает панель с заголовком и кнопкой закрытия, закрывает панель по клику на крестик', async () => {
      const wrapper = defaultMount()

      expect(wrapper.find('#planner-panel-heading').text()).toContain('Планетарные события')
      const closeBtn = wrapper.find('.close-btn')
      expect(closeBtn.exists()).toBe(true)

      await closeBtn.trigger('click')
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('закрывает панель по нажатию Escape', async () => {
      const wrapper = defaultMount()
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('переключает тип явления (Соединение / Противостояние / Парад планет)', async () => {
      const wrapper = defaultMount()

      const selectButton = wrapper.findComponent({ name: 'SelectButton' })
      expect(selectButton.exists()).toBe(true)
      expect(selectButton.props('modelValue')).toBe('conjunction')

      // Переключаем на Парад планет
      await selectButton.vm.$emit('update:modelValue', 'parade')
      expect(selectButton.props('modelValue')).toBe('parade')

      // Переключаем на Противостояние
      await selectButton.vm.$emit('update:modelValue', 'opposition')
      expect(selectButton.props('modelValue')).toBe('opposition')
    })

    it('позволяет выбирать и снимать планеты через ToggleButton', async () => {
      const wrapper = defaultMount()

      const toggleButtons = wrapper.findAllComponents({ name: 'ToggleButton' })
      // Найдем кнопку для Венеры (изначально не выбрана: по дефолту earth, mars)
      const venusBtn = toggleButtons.find(btn => btn.props('ariaLabel') === 'Венера')
      expect(venusBtn).toBeDefined()
      expect(venusBtn?.props('modelValue')).toBe(false)

      // Включаем Венеру
      await venusBtn?.vm.$emit('update:modelValue', true)
      expect(venusBtn?.props('modelValue')).toBe(true)

      // Снимаем Марс
      const marsBtn = toggleButtons.find(btn => btn.props('ariaLabel') === 'Марс')
      expect(marsBtn?.props('modelValue')).toBe(true)
      await marsBtn?.vm.$emit('update:modelValue', false)
      expect(marsBtn?.props('modelValue')).toBe(false)
    })

    it('позволяет вводить горизонт прогноза в InputNumber', async () => {
      const wrapper = defaultMount()

      const inputNumber = wrapper.findComponent({ name: 'InputNumber' })
      expect(inputNumber.exists()).toBe(true)
      expect(inputNumber.props('modelValue')).toBe(800)

      await inputNumber.vm.$emit('update:modelValue', 365)
      expect(inputNumber.props('modelValue')).toBe(365)
    })
  })

  describe('Валидация', () => {
    it('блокирует запрос и показывает ошибку при выборе меньше 2 планет (0 или 1)', async () => {
      const searchSpy = vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents')
      const wrapper = defaultMount()

      // Снимаем обе дефолтные планеты (earth, mars)
      const toggleButtons = wrapper.findAllComponents({ name: 'ToggleButton' })
      const earthBtn = toggleButtons.find(btn => btn.props('ariaLabel') === 'Земля')
      const marsBtn = toggleButtons.find(btn => btn.props('ariaLabel') === 'Марс')

      await earthBtn?.vm.$emit('update:modelValue', false)
      await marsBtn?.vm.$emit('update:modelValue', false)

      const findBtn = wrapper.findComponent('.find-event-btn')
      await findBtn.trigger('click')

      expect(searchSpy).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Выберите минимум 2 планеты для расчёта')

      // Добавим 1 планету — все еще ошибка
      await earthBtn?.vm.$emit('update:modelValue', true)
      await findBtn.trigger('click')

      expect(searchSpy).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Выберите минимум 2 планеты для расчёта')
    })

    it('блокирует запрос и показывает ошибку при параде планет с менее 3 планет', async () => {
      const searchSpy = vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents')
      const wrapper = defaultMount()

      const selectButton = wrapper.findComponent({ name: 'SelectButton' })
      await selectButton.vm.$emit('update:modelValue', 'parade')

      // Снимаем одну из планет (по умолчанию для parade ставится venus, earth, mars)
      const toggleButtons = wrapper.findAllComponents({ name: 'ToggleButton' })
      const venusBtn = toggleButtons.find(btn => btn.props('ariaLabel') === 'Венера')
      await venusBtn?.vm.$emit('update:modelValue', false)

      const findBtn = wrapper.findComponent('.find-event-btn')
      await findBtn.trigger('click')

      expect(searchSpy).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('Выберите минимум 3 планеты для парада планет')
    })

    it.each([0, -5, 5000, null])(
      'блокирует запрос и показывает ошибку при некорректном числе дней (%s)',
      async (invalidDays) => {
        const searchSpy = vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents')
        const wrapper = defaultMount()

        const inputNumber = wrapper.findComponent({ name: 'InputNumber' })
        await inputNumber.vm.$emit('update:modelValue', invalidDays)

        const findBtn = wrapper.findComponent('.find-event-btn')
        await findBtn.trigger('click')

        expect(searchSpy).not.toHaveBeenCalled()
        expect(wrapper.text()).toContain('Укажите горизонт прогноза от 1 до 3650 дней')
      }
    )
  })

  describe('Защита от повторной отправки', () => {
    it('при медленном Promise повторный клик и Enter не создают второй запрос', async () => {
      let resolvePromise: (value: planetaryEventsApi.PlanetaryEventCalculationResponse) => void
      const slowPromise = new Promise<planetaryEventsApi.PlanetaryEventCalculationResponse>((resolve) => {
        resolvePromise = resolve
      })

      const searchSpy = vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockImplementation(() => slowPromise)

      const wrapper = defaultMount()
      const findBtn = wrapper.findComponent('.find-event-btn')

      // Первый клик
      await findBtn.trigger('click')
      expect(searchSpy).toHaveBeenCalledTimes(1)

      // Повторный клик во время загрузки
      await findBtn.trigger('click')
      expect(searchSpy).toHaveBeenCalledTimes(1)

      // Нажатие Enter на InputNumber во время загрузки
      const inputNumber = wrapper.findComponent({ name: 'InputNumber' })
      await inputNumber.trigger('keydown', { key: 'Enter' })
      expect(searchSpy).toHaveBeenCalledTimes(1)

      // Завершаем промис
      resolvePromise!({
        success: true,
        event: {
          status: 'FOUND',
          eventType: 'conjunction',
          participatingPlanets: ['earth', 'mars'],
          time: 50,
          minAngularDifferenceDeg: 0.8,
          title: 'Соединение Земли и Марса',
          targetDate: '2026-05-10T12:00:00.000Z'
        }
      })
      await wrapper.vm.$nextTick()
    })
  })

  describe('Состояния интерфейса', () => {
    it('отображает Skeleton во время загрузки', async () => {
      let resolvePromise: (value: planetaryEventsApi.PlanetaryEventCalculationResponse) => void
      const slowPromise = new Promise<planetaryEventsApi.PlanetaryEventCalculationResponse>((resolve) => {
        resolvePromise = resolve
      })

      vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockImplementation(() => slowPromise)

      const wrapper = defaultMount()
      const findBtn = wrapper.findComponent('.find-event-btn')
      await findBtn.trigger('click')

      // Проверяем наличие Skeleton
      const skeletons = wrapper.findAllComponents({ name: 'Skeleton' })
      expect(skeletons.length).toBeGreaterThan(0)
      expect(wrapper.find('.skeleton-card').exists()).toBe(true)

      resolvePromise!({ success: true, event: null })
      await wrapper.vm.$nextTick()
    })

    it('отображает пустое состояние при отсутствии событий за период', async () => {
      vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockResolvedValue({
        success: true,
        event: null
      })

      const wrapper = defaultMount()
      const findBtn = wrapper.findComponent('.find-event-btn')
      await findBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.empty-view').exists()).toBe(true)
      expect(wrapper.text()).toContain('За указанный период таких явлений не найдено. Попробуйте увеличить горизонт прогноза')
    })

    it('отображает успешный результат: карточка события с датой и кнопкой «Показать на орбите», эмитит time-jump', async () => {
      vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockResolvedValue({
        success: true,
        event: {
          status: 'FOUND',
          eventType: 'conjunction',
          participatingPlanets: ['earth', 'mars'],
          time: 120,
          minAngularDifferenceDeg: 0.45,
          title: 'Соединение Земли и Марса',
          targetDate: '2026-07-20T00:00:00.000Z'
        }
      })

      const wrapper = defaultMount()
      const findBtn = wrapper.findComponent('.find-event-btn')
      await findBtn.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.success-view').exists()).toBe(true)
      expect(wrapper.text()).toContain('Найдено')
      expect(wrapper.text()).toContain('Δθ = 0.45°')
      expect(wrapper.text()).toContain('Соединение Земли и Марса')
      expect(wrapper.text()).toContain('+120 дн.')

      const jumpBtn = wrapper.findComponent('.jump-to-orbit-btn')
      expect(jumpBtn.exists()).toBe(true)
      expect(jumpBtn.text()).toContain('Показать на орбите')

      await jumpBtn.trigger('click')
      expect(wrapper.emitted('time-jump')).toBeTruthy()
      expect(wrapper.emitted('time-jump')?.[0]).toEqual([120])
    })

    it('при ошибке сервера отображает Message с ошибкой и кнопкой повтора, а форма сохраняет введенные данные', async () => {
      vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockRejectedValue(
        new Error('Сервер временно недоступен')
      )

      const wrapper = defaultMount()

      // Меняем горизонт на 1200 дней
      const inputNumber = wrapper.findComponent({ name: 'InputNumber' })
      await inputNumber.vm.$emit('update:modelValue', 1200)

      const findBtn = wrapper.findComponent('.find-event-btn')
      await findBtn.trigger('click')
      await wrapper.vm.$nextTick()

      // Отображается Message с ошибкой
      const messageComp = wrapper.findComponent({ name: 'Message' })
      expect(messageComp.exists()).toBe(true)
      expect(wrapper.text()).toContain('Сервер временно недоступен')

      // Параметры сохранены
      expect(inputNumber.props('modelValue')).toBe(1200)
      const selectButton = wrapper.findComponent({ name: 'SelectButton' })
      expect(selectButton.props('modelValue')).toBe('conjunction')

      // Кнопка «Повторить попытку»
      const retryBtn = wrapper.findComponent('.retry-btn')
      expect(retryBtn.exists()).toBe(true)

      const searchSpy = vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockResolvedValue({
        success: true,
        event: null
      })

      await retryBtn.trigger('click')
      expect(searchSpy).toHaveBeenCalled()
    })
  })
})

describe('Интеграция с CanvasViewport и перемотка на орбите', () => {
  it('открывает панель событий, находит событие и вызывает jumpToTime на SolarScene при клике «Показать на орбите»', async () => {
    vi.spyOn(planetaryEventsApi, 'searchPlanetaryEvents').mockResolvedValue({
      success: true,
      event: {
        status: 'FOUND',
        eventType: 'conjunction',
        participatingPlanets: ['earth', 'mars'],
        time: 215,
        minAngularDifferenceDeg: 0.12,
        title: 'Великое соединение',
        targetDate: '2026-11-01T00:00:00.000Z'
      }
    })

    const wrapper = mount(CanvasViewport, {
      global: {
        plugins: [
          [
            PrimeVue,
            {
              theme: {
                preset: Aura,
                options: { darkModeSelector: '.dark' }
              }
            }
          ]
        ]
      }
    })

    // Изначально панель закрыта
    expect(wrapper.findComponent(AstronomicalEventsPanel).exists()).toBe(false)

    // Кликаем по кнопке «События»
    const eventsToggle = wrapper.findComponent('.events-toggle-btn')
    await eventsToggle.trigger('click')

    // Панель открылась
    const panel = wrapper.findComponent(AstronomicalEventsPanel)
    expect(panel.exists()).toBe(true)

    // Ищем событие
    const findBtn = panel.findComponent('.find-event-btn')
    await findBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // Кликаем «Показать на орбите»
    const jumpBtn = panel.findComponent('.jump-to-orbit-btn')
    expect(jumpBtn.exists()).toBe(true)
    await jumpBtn.trigger('click')

    // Проверяем, что jumpToTime был вызван с нужным временем
    expect(mockSolarSceneInstance.jumpToTime).toHaveBeenCalledWith(215)
  })
})
