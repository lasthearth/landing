import { DiscordGalleryImage } from '@shared/lib/discord-gallery/discord-gallery.service';
import { readShotCaption } from '@shared/lib/discord-gallery/read-shot-caption.function';

/**
 * Автор архива и число его кадров.
 */
export interface ArchiveAuthor {
    /**
     * Имя автора как оно пришло из Discord.
     */
    name: string;

    /**
     * Сколько кадров этого автора в архиве.
     */
    count: number;
}

/**
 * Факты об архиве канала, которые страница показывает как есть.
 */
export interface ArchiveFacts {
    /**
     * Всего кадров.
     */
    total: number;

    /**
     * Сколько разных авторов выкладывали кадры.
     */
    authors: number;

    /**
     * Авторы с наибольшим числом кадров.
     */
    topAuthors: ArchiveAuthor[];

    /**
     * Самый старый кадр архива или `null`, пока архив не загружен.
     */
    firstShot: DiscordGalleryImage | null;

    /**
     * Вертикальный кадр для печатного портрета рядом со списком авторов.
     *
     * Выбирается ближайшим к пропорции 4:5, чтобы рамка почти не обрезала
     * кадр. `null`, если вертикальных кадров в архиве нет.
     */
    portraitShot: DiscordGalleryImage | null;

    /**
     * Сколько месяцев архиву: от первого кадра до последнего.
     */
    months: number;

    /**
     * Сколько кадров подписаны словами самого игрока, а не именем файла.
     */
    captioned: number;

    /**
     * Сколько кадров выложено за 30 дней до самого свежего.
     */
    recentMonth: number;
}

/**
 * Снимок фактов об архиве — то, что имеет смысл хранить между визитами.
 *
 * Без кадров: у снимка нет адресов картинок, а значит он не может устареть
 * так, чтобы показать мёртвую ссылку. Числа архива меняются на пару единиц
 * в день, поэтому снимок показывает страницу целиком уже на первом кадре,
 * а живой пересчёт заменяет его, когда архив дочитан.
 */
export interface ArchiveFactsSnapshot {
    /**
     * Всего кадров.
     */
    total: number;

    /**
     * Сколько разных авторов.
     */
    authors: number;

    /**
     * Сколько месяцев архиву.
     */
    months: number;

    /**
     * Сколько кадров подписано словами игрока.
     */
    captioned: number;

    /**
     * Сколько кадров за 30 дней до самого свежего.
     */
    recentMonth: number;

    /**
     * Дата первого кадра архива, ISO.
     */
    firstShotDate: string | null;

    /**
     * Авторы с наибольшим числом кадров.
     */
    topAuthors: ArchiveAuthor[];
}

/**
 * Сжимает факты до снимка, который можно положить в localStorage.
 *
 * @param facts Факты об архиве.
 * @returns Снимок без кадров.
 */
export function toFactsSnapshot(facts: ArchiveFacts): ArchiveFactsSnapshot {
    return {
        total: facts.total,
        authors: facts.authors,
        months: facts.months,
        captioned: facts.captioned,
        recentMonth: facts.recentMonth,
        firstShotDate: facts.firstShot?.timestamp ?? null,
        topAuthors: facts.topAuthors,
    };
}

/**
 * Подставляет скаляры из снимка в факты, собранные по неполному архиву.
 *
 * «Первый кадр» обнуляется: по неполному архиву им становится самый старый
 * из загруженных, а подпись под печатью обещает именно первый кадр —
 * это разные кадры, пока страницы дочитываются. Дата первого кадра берётся
 * из снимка: он не меняется, поэтому снимок для неё — источник верный.
 * Вертикальный кадр для портрета не обнуляется: подпись под ним обещает
 * лишь «кадр из архива», а не конкретный.
 *
 * @param live Факты по загруженным кадрам.
 * @param snapshot Снимок прошлого полного прохода или `null`.
 * @returns Факты со скалярами снимка и кадрами живого прохода.
 */
export function withFactsSnapshot(live: ArchiveFacts, snapshot: ArchiveFactsSnapshot | null): ArchiveFacts {
    if (!snapshot) {
        return live;
    }

    return {
        ...live,
        total: snapshot.total,
        authors: snapshot.authors,
        months: snapshot.months,
        captioned: snapshot.captioned,
        recentMonth: snapshot.recentMonth,
        topAuthors: snapshot.topAuthors,
        firstShot: null,
    };
}

/**
 * Сколько миллисекунд в 30 днях.
 */
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Пропорция печатного портрета рядом со списком авторов.
 */
const PORTRAIT_RATIO = 4 / 5;

/**
 * Кадр считается вертикальным, если он уже этой пропорции.
 */
const PORTRAIT_MAX_RATIO = 1;

/**
 * Считает факты об архиве скриншотов.
 *
 * Все числа берутся из загруженных кадров, поэтому ничего из этого не
 * приходится хардкодить в тексте страницы: архив растёт, и подписи
 * остаются правдой. Порядок списка не важен.
 *
 * @param images Кадры архива.
 * @param topCount Сколько авторов попадут в список самых активных.
 * @returns Факты об архиве.
 */
export function readArchiveFacts(
    images: readonly DiscordGalleryImage[],
    topCount: number
): ArchiveFacts {
    const empty: ArchiveFacts = {
        total: 0,
        authors: 0,
        topAuthors: [],
        firstShot: null,
        portraitShot: null,
        months: 0,
        captioned: 0,
        recentMonth: 0,
    };

    const times: number[] = [];
    const counts = new Map<string, number>();
    let captioned = 0;
    let oldest = Number.POSITIVE_INFINITY;
    let newest = Number.NEGATIVE_INFINITY;

    for (const image of images) {
        const time = new Date(image.timestamp).getTime();

        if (Number.isFinite(time)) {
            times.push(time);
            oldest = Math.min(oldest, time);
            newest = Math.max(newest, time);
        }

        if (readShotCaption(image.alt)) {
            captioned += 1;
        }

        counts.set(image.author, (counts.get(image.author) ?? 0) + 1);
    }

    if (times.length === 0) {
        return { ...empty, total: images.length, authors: counts.size };
    }

    const firstShot = images.find((image) => new Date(image.timestamp).getTime() === oldest) ?? null;

    return {
        total: images.length,
        authors: counts.size,
        topAuthors: [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, topCount)
            .map(([name, count]) => ({ name, count })),
        firstShot,
        portraitShot: pickPortraitShot(images),
        months: monthsBetween(oldest, newest),
        captioned,
        recentMonth: times.filter((time) => time > newest - MONTH_MS).length,
    };
}

/**
 * Выбирает вертикальный кадр для печатного портрета 4:5.
 *
 * Берёт ближайший к пропорции рамки, чтобы обрезка не съедала кадр,
 * а при равенстве — более свежий. Горизонтальные кадры не подходят:
 * в рамке 4:5 от скриншота 16:9 осталась бы узкая полоса.
 *
 * @param images Кадры архива.
 * @returns Кадр или `null`, если вертикальных нет.
 */
function pickPortraitShot(images: readonly DiscordGalleryImage[]): DiscordGalleryImage | null {
    let best: DiscordGalleryImage | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const image of images) {
        if (!image.width || !image.height) {
            continue;
        }

        const ratio = image.width / image.height;

        if (ratio > PORTRAIT_MAX_RATIO) {
            continue;
        }

        const score = Math.abs(ratio - PORTRAIT_RATIO) - new Date(image.timestamp).getTime() / 1e15;

        if (score < bestScore) {
            bestScore = score;
            best = image;
        }
    }

    return best;
}

/**
 * Считает число календарных месяцев между двумя моментами включительно.
 *
 * Месяцы берутся по UTC: граница месяца в локальной зоне посетителя
 * сдвинула бы число на единицу и дала бы расхождение сервера и браузера.
 *
 * @param from Более ранний момент, мс.
 * @param to Более поздний момент, мс.
 * @returns Число месяцев, не меньше одного.
 */
function monthsBetween(from: number, to: number): number {
    const start = new Date(from);
    const end = new Date(to);
    const months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1;

    return Math.max(1, months);
}
