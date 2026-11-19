import { describe, it, expect } from 'vitest'
import { searchPlanetaryEvents } from '../src/api/planetaryEventsApi'

describe('planetaryEventsApi', () => {
  it('returns found event after delay', async () => {
    const start = Date.now()
    const res = await searchPlanetaryEvents(
      {
        eventType: 'conjunction',
        planetIds: ['earth', 'mars'],
        forecastDays: 800
      },
      { delayMs: 50 }
    )
    const elapsed = Date.now() - start

    expect(elapsed).toBeGreaterThanOrEqual(40)
    expect(res.success).toBe(true)
    expect(res.event).toBeDefined()
    expect(res.event?.status).toBe('FOUND')
    expect(res.event?.minAngularDifferenceDeg).toBeDefined()
  })

  it('returns empty result when no event is found', async () => {
    const res = await searchPlanetaryEvents(
      {
        eventType: 'opposition',
        planetIds: ['earth', 'jupiter'],
        forecastDays: 5
      },
      { delayMs: 10 }
    )

    expect(res.success).toBe(true)
    expect(res.event).toBeNull()
  })

  it('rejects promise on simulated failure or invalid parameters', async () => {
    await expect(
      searchPlanetaryEvents(
        {
          eventType: 'conjunction',
          planetIds: ['earth'],
          forecastDays: 100
        },
        { delayMs: 10 }
      )
    ).rejects.toThrow()
  })

  it('rejects promise when shouldSimulateFailure is requested', async () => {
    await expect(
      searchPlanetaryEvents(
        {
          eventType: 'conjunction',
          planetIds: ['earth', 'mars'],
          forecastDays: 800
        },
        { delayMs: 10, shouldSimulateFailure: true }
      )
    ).rejects.toThrow('Сбой сервиса')
  })
})
