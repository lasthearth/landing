/**
 * Переводы для страницы архива скриншотов.
 *
 * Числа и даты в подписях не захардкожены: они приходят параметрами
 * из `readArchiveFacts`, поэтому текст остаётся правдой, пока архив растёт.
 * Параметры стоят в двойных фигурных скобках — их подставляет `I18nService`.
 *
 * Значения `en` написаны без апострофов намеренно: `scripts/i18n-tool.mjs`
 * не понимает экранирование, и один `\'` роняет всю локаль после строки
 * (`docs/TRAPS.md`).
 */
export const GALLERY_I18N = {
    ru: {
        gallery: {
            title: 'Галерея скриншотов',
            loading: 'Загружаем скриншоты из Discord...',
            empty: 'В канале пока нет скриншотов.',
            error: 'Не удалось загрузить галерею.',
            retry: 'Попробовать снова',
            shot: {
                gone: 'Кадр не открылся',
            },
            dial: {
                more: 'Ещё {{count}} кадров · до {{date}}',
                depth: 'Показано {{shown}} из {{total}} · стена дошла до {{date}}',
                depthPartial: 'Показано {{shown}} · стена дошла до {{date}}',
                loading: 'Дочитываем архив…',
                broken: 'Связь оборвалась — архив показан не целиком.',
                end: '{{date}} — первый кадр архива. Дальше хода нет.',
            },
        },
    },
    en: {
        gallery: {
            title: 'Screenshot Gallery',
            loading: 'Loading screenshots from Discord...',
            empty: 'No screenshots in the channel yet.',
            error: 'Failed to load the gallery.',
            retry: 'Try again',
            shot: {
                gone: 'This shot did not load',
            },
            dial: {
                more: '{{count}} more shots, back to {{date}}',
                depth: '{{shown}} of {{total}} shown, the wall has reached {{date}}',
                depthPartial: '{{shown}} shown, the wall has reached {{date}}',
                loading: 'Still reading the archive…',
                broken: 'The connection dropped, so the archive is incomplete.',
                end: '{{date}}: the first shot in the archive. There is no further back.',
            },
        },
    },
};
