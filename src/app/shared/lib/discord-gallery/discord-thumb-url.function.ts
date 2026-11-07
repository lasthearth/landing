/**
 * Хост медиа-прокси Discord. Только он умеет менять размер на лету:
 * `cdn.discordapp.com` параметры `width`/`height` игнорирует и отдаёт
 * оригинал (проверено: 1920×1080 PNG 1.6 МБ против 680×382 JPEG 27 КБ).
 */
const PROXY_HOST = 'media.discordapp.net';

/**
 * Строит адрес уменьшенной копии картинки через медиа-прокси Discord.
 *
 * Прокси требует обе стороны сразу: с одним `width` он размер не меняет,
 * а с `width` и `height` приводит картинку точно к заданной коробке,
 * не сохраняя пропорции. Поэтому коробку нужно считать от настоящих
 * пропорций кадра — тогда копия повторяет оригинал и не сплющивается.
 * Прокси не увеличивает мелкие картинки: кадр 269×21 вернётся как есть.
 *
 * Адреса не с медиа-прокси функция возвращает без изменений: параметры
 * чужого хоста могут сломать подпись или отдать другую картинку.
 *
 * @param proxyUrl Адрес картинки из поля `proxy_url`.
 * @param width Ширина коробки, px.
 * @param height Высота коробки, px.
 * @returns Адрес уменьшенной копии или исходный адрес.
 */
export function buildDiscordThumbUrl(proxyUrl: string, width: number, height: number): string {
    if (!proxyUrl || width < 1 || height < 1) {
        return proxyUrl;
    }

    let parsed: URL;

    try {
        parsed = new URL(proxyUrl);
    } catch {
        return proxyUrl;
    }

    if (parsed.hostname !== PROXY_HOST) {
        return proxyUrl;
    }

    parsed.searchParams.set('width', String(Math.round(width)));
    parsed.searchParams.set('height', String(Math.round(height)));
    parsed.searchParams.set('format', 'jpeg');

    return parsed.toString();
}

/**
 * Кадр, по которому можно построить уменьшенную копию.
 *
 * Тип структурный: элемент галереи подходит под него без импорта,
 * поэтому функция остаётся чистой и не знает о сервисе архива.
 */
export interface ThumbSource {
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
 * Строит адрес уменьшенной копии кадра под заданную ширину.
 *
 * Пропорцию берёт из размеров оригинала, поэтому копия не сплющивается;
 * когда размеры неизвестны, возвращает адрес превью как есть.
 *
 * @param source Кадр архива.
 * @param targetWidth Нужная ширина копии, px.
 * @returns Адрес копии или исходный адрес превью.
 */
export function buildThumbUrl(source: ThumbSource, targetWidth: number): string {
    const box = fitThumbBox(source.width, source.height, targetWidth);

    return box ? buildDiscordThumbUrl(source.proxyUrl, box.width, box.height) : source.proxyUrl;
}

/**
 * Считает размеры копии под реальную пропорцию кадра.
 *
 * Проверяет, что копия впишется в заданную ширину, и не просит у прокси
 * сторону длиннее исходной: иначе он вернёт оригинал без сжатия.
 *
 * @param sourceWidth Ширина оригинала, px.
 * @param sourceHeight Высота оригинала, px.
 * @param targetWidth Ширина копии, px.
 * @returns Ширина и высота копии или `null`, если пропорции неизвестны.
 */
export function fitThumbBox(
    sourceWidth: number | undefined,
    sourceHeight: number | undefined,
    targetWidth: number,
): { width: number; height: number } | null {
    if (!sourceWidth || !sourceHeight || targetWidth < 1) {
        return null;
    }

    const ratio = sourceWidth / sourceHeight;

    if (!Number.isFinite(ratio) || ratio <= 0) {
        return null;
    }

    const width = Math.min(targetWidth, sourceWidth);

    return { width, height: Math.max(1, Math.round(width / ratio)) };
}
