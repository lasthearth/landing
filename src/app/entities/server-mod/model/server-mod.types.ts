/**
 * Кому нужен мод (поле `audience` в API).
 */
export type ModAudience = 'MOD_AUDIENCE_REQUIRED' | 'MOD_AUDIENCE_OPTIONAL' | 'MOD_AUDIENCE_HIDDEN';

/**
 * Где работает мод — как указано на ModDB.
 */
export type ModSide = 'MOD_SIDE_BOTH' | 'MOD_SIDE_CLIENT' | 'MOD_SIDE_SERVER' | 'MOD_SIDE_UNSPECIFIED';

/**
 * Версия мода на ModDB в ответе API.
 */
export interface ModReleaseDto {
    version?: string;
    game_versions?: string[];
    file_url?: string;
    file_name?: string;
    /** `int64` приходит строкой. */
    file_size?: string | number;
    released_at?: string;
}

/**
 * Мод в ответе API (`mod.v1.Mod`, vsservice tasks/006).
 */
export interface ServerModDto {
    id?: string;
    name?: string;
    author?: string;
    logo_url?: string;
    moddb_url?: string;
    side?: ModSide;
    audience?: ModAudience | 'MOD_AUDIENCE_UNSPECIFIED';
    note?: string;
    summary?: string;
    release?: ModReleaseDto;
    latest_version?: string;
    position?: number;
    updated_at?: string;
    releases?: ModReleaseDto[];
}

/**
 * Архив «Скачать всё» в ответе API.
 */
export interface ModArchiveDto {
    url?: string;
    count?: number;
    size?: string | number;
    updated_at?: string;
}

/**
 * Ответ `GET /v1/mods`.
 */
export interface ListModsDto {
    mods?: ServerModDto[];
    archive?: ModArchiveDto;
}

/**
 * Ответ `GET /v1/mods/lookup`.
 */
export interface LookupModDto {
    mod?: ServerModDto;
    releases?: ModReleaseDto[];
}

/**
 * Версия мода.
 */
export interface ModRelease {
    version: string;
    /** Версии игры, для которых автор выпустил эту версию. */
    gameVersions: string[];
    fileUrl: string;
    fileName: string;
    /** Размер в байтах; 0 — неизвестен. */
    fileSize: number;
    releasedAt: Date | null;
}

/**
 * Мод игрового сервера.
 */
export interface ServerMod {
    /** Идентификатор мода в игре и на ModDB, например `carryon`. */
    id: string;
    name: string;
    author: string;
    logoUrl: string;
    moddbUrl: string;
    side: ModSide;
    audience: ModAudience;
    /** Пометка модератора по-русски: зачем мод игроку. */
    note: string;
    /** Первая фраза описания с ModDB — если пометки нет. */
    summary: string;
    /** Версия, на которой работает сервер. */
    release: ModRelease | null;
    /** Новая версия на ModDB; пусто, если сервер уже на последней. */
    latestVersion: string;
    /** Последние версии с ModDB, от новой к старой (только в админке). */
    releases: ModRelease[];
}

/**
 * Архив всех обязательных модов.
 */
export interface ModArchive {
    /** Абсолютный адрес архива. */
    url: string;
    count: number;
    /** Размер в байтах; 0 — неизвестен. */
    size: number;
    updatedAt: Date | null;
}

/**
 * Публичный список модов.
 */
export interface ServerModList {
    mods: ServerMod[];
    archive: ModArchive | null;
}

/**
 * Мод, найденный на ModDB, — ещё не в списке.
 */
export interface ModLookup {
    mod: ServerMod;
    releases: ModRelease[];
}

/**
 * Добавление мода.
 */
export interface AddModRequest {
    /** Ссылка на ModDB или идентификатор мода. */
    query: string;
    version: string;
    audience: ModAudience;
    note: string;
}

/**
 * Изменение мода: незаданные поля не меняются.
 */
export interface UpdateModRequest {
    version?: string;
    audience?: ModAudience;
    note?: string;
}

/**
 * Насколько версия мода подходит к версии игры сервера.
 *
 * - `exact` — автор отметил эту версию игры;
 * - `minor` — отмечена другая версия той же ветки (1.22.x);
 * - `other` — версия для другой ветки игры или не указана.
 */
export type ModCompatibility = 'exact' | 'minor' | 'other';
