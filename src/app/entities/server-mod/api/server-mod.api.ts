import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { map, Observable } from 'rxjs';
import {
    mapModArchive,
    mapModReleases,
    mapServerMod,
    mapServerMods,
} from '../model/server-mod.mapper';
import {
    AddModRequest,
    ListModsDto,
    LookupModDto,
    ModLookup,
    ServerMod,
    ServerModDto,
    ServerModList,
    UpdateModRequest,
} from '../model/server-mod.types';

/**
 * API модов игрового сервера (vsservice, `mod.v1.ModService`).
 *
 * Публичный список и архив открыты всем; управление — тем, кто публикует
 * новости (scope `news:create`). Данные о модах бэкенд берёт с ModDB сам:
 * у ModDB нет CORS, из браузера его не спросить.
 */
@Injectable({ providedIn: 'root' })
export class ServerModApiService {
    /**
     * HTTP-клиент.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API (`…/v1`).
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Адрес API без пути: путь архива приходит от корня (`/v1/mods/archive.zip`).
     */
    private readonly apiOrigin = new URL(environment.apiUrl).origin;

    /**
     * Моды, которые видят игроки, и архив обязательных.
     *
     * Ошибка не всплывает уведомлением: страница показывает своё состояние.
     *
     * @returns Observable со списком.
     */
    public list(): Observable<ServerModList> {
        return this.http
            .get<ListModsDto>(`${this.baseUrl}/mods`, { context: new HttpContext().set(SKIP_ERROR_ALERT, true) })
            .pipe(
                map((response) => ({
                    mods: mapServerMods(response.mods),
                    archive: mapModArchive(response.archive, this.apiOrigin),
                }))
            );
    }

    /**
     * Все моды для админки, со скрытыми и с версиями на ModDB.
     *
     * @returns Observable со списком.
     */
    public listAdmin(): Observable<ServerMod[]> {
        return this.http
            .get<{ mods?: ServerModDto[] }>(`${this.baseUrl}/mods/manage`, {
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map((response) => mapServerMods(response.mods)));
    }

    /**
     * Ищет мод на ModDB по ссылке или идентификатору. Ничего не сохраняет.
     *
     * Ошибку показывает форма (не найден, ModDB молчит), поэтому общее
     * уведомление отключено.
     *
     * @param query Ссылка на ModDB или идентификатор.
     * @returns Observable с найденным модом или `null`.
     */
    public lookup(query: string): Observable<ModLookup | null> {
        return this.http
            .get<LookupModDto>(`${this.baseUrl}/mods/lookup`, {
                params: { query },
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(
                map((response) => {
                    const mod = mapServerMod(response.mod);
                    return mod ? { mod, releases: mapModReleases(response.releases) } : null;
                })
            );
    }

    /**
     * Добавляет мод первым в список.
     *
     * @param request Мод, версия, аудитория и пометка.
     * @returns Observable с добавленным модом.
     */
    public add(request: AddModRequest): Observable<ServerMod | null> {
        return this.http
            .post<ServerModDto>(`${this.baseUrl}/mods`, request, {
                context: new HttpContext().set(SKIP_ERROR_ALERT, true),
            })
            .pipe(map(mapServerMod));
    }

    /**
     * Меняет версию, аудиторию или пометку мода.
     *
     * @param id Идентификатор мода.
     * @param request Изменённые поля.
     * @returns Observable с модом после изменения.
     */
    public update(id: string, request: UpdateModRequest): Observable<ServerMod | null> {
        return this.http
            .patch<ServerModDto>(`${this.baseUrl}/mods/${encodeURIComponent(id)}`, { id, ...request })
            .pipe(map(mapServerMod));
    }

    /**
     * Убирает мод из списка.
     *
     * @param id Идентификатор мода.
     * @returns Observable, завершающийся после удаления.
     */
    public delete(id: string): Observable<void> {
        return this.http.delete<unknown>(`${this.baseUrl}/mods/${encodeURIComponent(id)}`).pipe(map(() => undefined));
    }

    /**
     * Задаёт порядок модов на странице.
     *
     * @param ids Все идентификаторы в новом порядке.
     * @returns Observable со списком после изменения.
     */
    public reorder(ids: string[]): Observable<ServerMod[]> {
        return this.http
            .put<{ mods?: ServerModDto[] }>(`${this.baseUrl}/mods/order`, { ids })
            .pipe(map((response) => mapServerMods(response.mods)));
    }

    /**
     * Перечитывает все моды с ModDB: новые версии, названия, логотипы.
     * Выбранные версии не меняются.
     *
     * @returns Observable со списком после проверки.
     */
    public refresh(): Observable<ServerMod[]> {
        return this.http
            .post<{ mods?: ServerModDto[] }>(`${this.baseUrl}/mods:refresh`, {})
            .pipe(map((response) => mapServerMods(response.mods)));
    }
}
