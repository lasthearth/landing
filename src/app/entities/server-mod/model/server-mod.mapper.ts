import {
    ModArchive,
    ModArchiveDto,
    ModAudience,
    ModRelease,
    ModReleaseDto,
    ServerMod,
    ServerModDto,
} from './server-mod.types';

/**
 * Превращает строку даты в `Date` или `null`.
 *
 * @param value Дата ISO 8601.
 * @returns Дата или `null`.
 */
function toDate(value: string | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Превращает `int64` из API (строку или число) в число байт.
 *
 * @param value Значение из API.
 * @returns Число не меньше нуля.
 */
function toBytes(value: string | number | undefined): number {
    const bytes = Number(value ?? 0);
    return Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
}

/**
 * Версия мода из API.
 *
 * @param dto Версия из API.
 * @returns Версия или `null`, если у неё нет номера.
 */
export function mapModRelease(dto: ModReleaseDto | undefined): ModRelease | null {
    if (!dto?.version) {
        return null;
    }

    return {
        version: dto.version,
        gameVersions: dto.game_versions ?? [],
        fileUrl: dto.file_url ?? '',
        fileName: dto.file_name ?? '',
        fileSize: toBytes(dto.file_size),
        releasedAt: toDate(dto.released_at),
    };
}

/**
 * Список версий из API без пустых.
 *
 * @param list Версии из API.
 * @returns Версии.
 */
export function mapModReleases(list: ModReleaseDto[] | undefined): ModRelease[] {
    return (list ?? []).map(mapModRelease).filter((release): release is ModRelease => release !== null);
}

/**
 * Мод из API.
 *
 * Мод без идентификатора показать нельзя — для него `null`. Незаданная
 * аудитория считается «по желанию»: так мод не попадёт в архив по ошибке.
 *
 * @param dto Мод из API.
 * @returns Мод или `null`.
 */
export function mapServerMod(dto: ServerModDto | undefined): ServerMod | null {
    if (!dto?.id) {
        return null;
    }

    const audience: ModAudience =
        dto.audience === 'MOD_AUDIENCE_REQUIRED' || dto.audience === 'MOD_AUDIENCE_HIDDEN'
            ? dto.audience
            : 'MOD_AUDIENCE_OPTIONAL';

    return {
        id: dto.id,
        name: dto.name || dto.id,
        author: dto.author ?? '',
        logoUrl: dto.logo_url ?? '',
        moddbUrl: dto.moddb_url ?? '',
        side: dto.side ?? 'MOD_SIDE_UNSPECIFIED',
        audience,
        note: dto.note ?? '',
        summary: dto.summary ?? '',
        release: mapModRelease(dto.release),
        latestVersion: dto.latest_version ?? '',
        releases: mapModReleases(dto.releases),
    };
}

/**
 * Список модов из API без пустых.
 *
 * @param list Моды из API.
 * @returns Моды в порядке API.
 */
export function mapServerMods(list: ServerModDto[] | undefined): ServerMod[] {
    return (list ?? []).map(mapServerMod).filter((mod): mod is ServerMod => mod !== null);
}

/**
 * Архив «Скачать всё» из API.
 *
 * @param dto Архив из API.
 * @param apiOrigin Адрес API без пути (`https://api.lasthearth.ru`): `url` архива приходит путём.
 * @returns Архив или `null`, если обязательных модов нет.
 */
export function mapModArchive(dto: ModArchiveDto | undefined, apiOrigin: string): ModArchive | null {
    if (!dto?.url || !dto.count) {
        return null;
    }

    return {
        url: /^https?:\/\//.test(dto.url) ? dto.url : `${apiOrigin}${dto.url}`,
        count: dto.count,
        size: toBytes(dto.size),
        updatedAt: toDate(dto.updated_at),
    };
}
