import { buildThumbUrl } from '@shared/lib/discord-gallery/discord-thumb-url.function';

/**
 * Стадия адреса отпечатка стены.
 *
 * `thumb` — уменьшенная копия через медиа-прокси Discord, обычный случай.
 * `original` — копия не открылась, страница просит оригинал кадра.
 * `dead` — не открылся и оригинал, вместо картинки показывается заглушка.
 */
export type ShotStage = 'thumb' | 'original' | 'dead';

/**
 * Кадр, по которому строится адрес отпечатка.
 *
 * Тип структурный: элемент архива подходит под него без импорта, поэтому
 * функция остаётся чистой и не знает о сервисе.
 */
export interface ShotSource {
    /**
     * Адрес оригинала кадра.
     */
    url: string;

    /**
     * Адрес превью из поля `proxy_url`.
     */
    proxyUrl: string;

    /**
     * Ширина оригинала, px.
     */
    width?: number;

    /**
     * Высота оригинала, px.
     */
    height?: number;
}

/**
 * Переводит отпечаток на следующую стадию после сбоя загрузки.
 *
 * Порядок фиксированный и конечный: копия, оригинал, заглушка. Без третьей
 * стадии `<img>` с пустым `src` снова выстрелил бы `error`, и страница
 * ушла бы в бесконечный цикл замен.
 *
 * @param stage Текущая стадия или `undefined`, если кадр ещё не загружался.
 * @returns Следующая стадия.
 */
export function nextShotStage(stage: ShotStage | undefined): ShotStage {
    if (stage === undefined || stage === 'thumb') {
        return 'original';
    }

    return 'dead';
}

/**
 * Строит адрес отпечатка под его стадию.
 *
 * @param source Кадр архива.
 * @param thumbWidth Ширина запрашиваемой копии, px.
 * @param stage Стадия адреса.
 * @returns Адрес картинки или `null`, когда показывается заглушка.
 */
export function readShotSrc(source: ShotSource, thumbWidth: number, stage: ShotStage): string | null {
    if (stage === 'dead') {
        return null;
    }

    return stage === 'original' ? source.url : buildThumbUrl(source, thumbWidth);
}
