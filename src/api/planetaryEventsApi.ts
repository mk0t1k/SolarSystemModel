import {
  type EventType,
  type EventSearchParams,
  type EventSearchResult,
  findAstronomicalEvent,
  ERROR_MESSAGES_RU
} from '../core/astronomicalEvents'

export type PlanetaryEventType = EventType

export interface PlanetaryEventFilter {
  eventType: PlanetaryEventType
  planetIds: string[]
  forecastDays: number
  startTime?: number
}

export type PlanetaryEventResult = EventSearchResult

export interface PlanetaryEventCalculationResponse {
  success: boolean
  event?: PlanetaryEventResult | null
  error?: string
}

/**
 * Асинхронный сервис поиска планетарных событий с искусственной задержкой (~350 мс)
 * и поддержкой возврата результата, статуса ненахождения или отклонения промиса при ошибке.
 */
export async function searchPlanetaryEvents(
  params: PlanetaryEventFilter,
  options?: { delayMs?: number; shouldSimulateFailure?: boolean }
): Promise<PlanetaryEventCalculationResponse> {
  const delay = options?.delayMs ?? 350

  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  if (options?.shouldSimulateFailure) {
    throw new Error('Сбой сервиса расчёта планетарных орбит. Повторите попытку позже.')
  }

  const searchParams: EventSearchParams = {
    eventType: params.eventType,
    planetIds: params.planetIds,
    startTime: params.startTime ?? 0,
    timeRangeDays: params.forecastDays
  }

  const result = findAstronomicalEvent(searchParams)

  if (result.status === 'ERROR') {
    const errorText =
      result.errorMessage ||
      (result.errorCode ? ERROR_MESSAGES_RU[result.errorCode] : 'Некорректные параметры расчёта.')
    throw new Error(errorText)
  }

  if (result.status === 'NOT_FOUND') {
    return {
      success: true,
      event: null
    }
  }

  return {
    success: true,
    event: result
  }
}
