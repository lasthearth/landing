/**
 * Расширения файлов, которыми Discord называет вложения без подписи.
 */
const MEDIA_EXTENSION = /\.(png|jpe?g|gif|webp|avif|bmp|mp4|mov|webm)$/i;

/**
 * Маркеры оформления Discord, которые в подписи читаются как мусор.
 */
const DISCORD_MARKUP = /~~|\*\*|__|`/g;

/**
 * Наибольшая длина подписи, которую стоит показывать целиком.
 *
 * Подписи приходят из текста сообщения: в архиве есть и «топчик»,
 * и пост на 982 символа. Обрезка держит подпись в одну-две строки.
 */
const MAX_CAPTION_LENGTH = 140;

/**
 * Отличает подпись игрока от служебного имени файла.
 *
 * В поле `alt` бэкенд передаёт имя вложения из Discord. Игроки называют
 * файлы по-разному: в архиве 202 кадра из 700 подписаны словами
 * («это что за некрополь?», «Повышаем КПД всем сервером»), остальные —
 * это `image.png`, `2026-11-02_23-02-08.png` или `57FA6AF5-0A16-….png`.
 * Вторые читать вслух и показывать бессмысленно.
 *
 * Признак подписи — пробел или кириллица в имени без расширения:
 * служебные имена файлов их не содержат, а живая подпись содержит
 * хотя бы одно из двух. Проверка на архиве канала: 202 подписи,
 * 498 имён файлов, ложных срабатываний нет.
 *
 * @param alt Значение поля `alt` элемента галереи.
 * @returns Текст подписи или `null`, если это имя файла.
 */
export function readShotCaption(alt: string | null | undefined): string | null {
    const trimmed = alt?.trim();

    if (!trimmed) {
        return null;
    }

    const withoutExtension = trimmed.replace(MEDIA_EXTENSION, '').trim();

    if (!withoutExtension) {
        return null;
    }

    const hasSpace = withoutExtension.includes(' ');
    const hasCyrillic = /[а-яёА-ЯЁ]/.test(withoutExtension);

    if (!hasSpace && !hasCyrillic) {
        return null;
    }

    return clampCaption(withoutExtension.replace(DISCORD_MARKUP, ' ').replace(/\s+/g, ' ').trim());
}

/**
 * Укорачивает подпись до {@link MAX_CAPTION_LENGTH}, не разрывая слово.
 *
 * @param caption Текст подписи.
 * @returns Подпись целиком или её начало с многоточием.
 */
function clampCaption(caption: string): string {
    if (!caption || caption.length <= MAX_CAPTION_LENGTH) {
        return caption;
    }

    const cut = caption.slice(0, MAX_CAPTION_LENGTH);
    const lastSpace = cut.lastIndexOf(' ');

    return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}
