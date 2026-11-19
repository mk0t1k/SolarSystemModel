import { test, expect } from '@playwright/test'

test.describe('Сценарий: Планетарные события', () => {
  test('полный пользовательский сценарий: открытие панели, ввод параметров с клавиатуры, поиск, появление карточки и клик «Показать на орбите»', async ({
    page
  }) => {
    // 1. Открываем приложение
    await page.goto('/')

    // Ждем инициализации интерфейса и 3D холста
    await expect(page.locator('.canvas-container canvas')).toBeVisible()

    // 2. Открытие панели «Планетарные события»
    const eventsBtn = page.getByRole('button', { name: 'События' })
    await expect(eventsBtn).toBeVisible()
    await eventsBtn.click()

    // Проверяем, что панель открылась
    const panel = page.getByRole('region', { name: 'Панель поиска планетарных событий' })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: 'Планетарные события' })).toBeVisible()

    // 3. Переключение типа явления на «Соединение» (по умолчанию активно)
    // Проверим переключение на «Противостояние», затем вернемся на «Соединение»
    const oppositionOption = panel.getByRole('button', { name: 'Противостояние' })
    await oppositionOption.click()
    await expect(oppositionOption).toHaveAttribute('aria-pressed', 'true')

    const conjunctionOption = panel.getByRole('button', { name: 'Соединение' })
    await conjunctionOption.click()
    await expect(conjunctionOption).toHaveAttribute('aria-pressed', 'true')

    // 4. Выбор планет-участников: Земля и Марс
    // Проверим переключение планеты Венера (клик включит/выключит)
    const venusToggle = panel.getByRole('button', { name: 'Венера' })
    await venusToggle.click()
    await expect(venusToggle).toHaveAttribute('aria-pressed', 'true')
    // Отключаем Венеру обратно, оставляя Землю и Марс
    await venusToggle.click()
    await expect(venusToggle).toHaveAttribute('aria-pressed', 'false')

    // 5. Заполнение горизонта прогноза с клавиатуры
    const inputNumber = panel.locator('#time-range-input input, input#time-range-input_input, .sci-input-number input')
    await inputNumber.click()
    // Выделяем всё и вводим новое число дней с клавиатуры
    await inputNumber.press('ControlOrMeta+A')
    await inputNumber.press('Backspace')
    await inputNumber.pressSequentially('800')

    // 6. Запуск расчёта нажатием Enter в поле ввода
    await inputNumber.press('Enter')

    // 7. Проверка состояния загрузки (индикатор на кнопке или скелетон)
    // На короткое время активируется Skeleton или состояние кнопки
    // Ждем появления карточки с результатом события
    const resultCard = panel.locator('.event-result-card')
    await expect(resultCard).toBeVisible({ timeout: 10000 })

    // 8. Проверяем карточку найденного события
    await expect(resultCard.locator('.badge-success')).toHaveText('Найдено')
    await expect(resultCard.locator('.event-title')).toBeVisible()
    await expect(resultCard.locator('.date-highlight')).toBeVisible()

    // 9. Клик по кнопке «Показать на орбите»
    const jumpBtn = resultCard.getByRole('button', { name: 'Показать на орбите' })
    await expect(jumpBtn).toBeVisible()
    await jumpBtn.click()

    // Убеждаемся, что после клика интерфейс стабилен и карточка по-прежнему отображает выбранное событие
    await expect(resultCard).toBeVisible()

    // 10. Закрытие панели клавишей Escape
    await page.keyboard.press('Escape')
    await expect(panel).not.toBeVisible()
  })
})
