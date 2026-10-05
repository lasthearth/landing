import { VideoKind } from '../model/video-kind';

/**
 * Разделы страницы видео в порядке вкладок.
 */
export const VIDEO_KINDS: readonly VideoKind[] = ['videos', 'streams', 'shorts'];

/**
 * Префиксы служебных плейлистов YouTube для каждого раздела.
 *
 * Плейлист загрузок канала — `UU` + id канала. YouTube держит рядом отфильтрованные копии:
 * `UULF` — только обычные ролики, `UULV` — записи трансляций, `UUSH` — шортсы.
 */
export const VIDEO_KIND_PLAYLIST_PREFIX: Record<VideoKind, string> = {
    videos: 'UULF',
    streams: 'UULV',
    shorts: 'UUSH',
};
