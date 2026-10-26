import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SKIP_ERROR_ALERT } from '@core/interceptors/error.interceptor';
import { BehaviorSubject, map, Observable, ReplaySubject, share, switchMap } from 'rxjs';
import { IKitDef, IKitDefDto, IUpdateKitRequest } from '../model/kit-def.interface';
import { mapDtoToKitDef } from '../model/kitdef.mapper';

/**
 * API захваченных наборов (vsservice, `kitdef.v1.KitDefService`).
 *
 * Набор пишет игра при выдаче кита; vsservice владеет только отображаемыми
 * метаданными (`title`, `category`) и точечным удалением позиции. Два писателя
 * трогают непересекающиеся поля, поэтому `code`, `items` и `created_at`
 * остаются игровыми.
 *
 * Все три эндпоинта закрыты scope `kit:edit`: 401 без токена и 403 без права.
 * Список читается тихо (`SKIP_ERROR_ALERT`), потому что обычный посетитель не
 * должен видеть алерт о нехватке прав; ошибку показывает вызывающий код,
 * который сначала проверяет право. `Bearer` добавляет `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class KitdefService {
    /**
     * HTTP-клиент Angular.
     */
    private readonly http = inject(HttpClient);

    /**
     * Базовый URL API (`…/v1`).
     */
    private readonly baseUrl = environment.apiUrl;

    /**
     * Триггер запроса списка наборов.
     *
     * `BehaviorSubject` нужен, чтобы первый подписчик сразу запустил запрос:
     * обычный `Subject` не дал бы значения до первого `next()`.
     */
    private readonly kitsRefresh$ = new BehaviorSubject<void>(undefined);

    /**
     * Кэшированный Observable со списком наборов.
     *
     * Наборы меняются редко, поэтому успех запоминается на всю сессию
     * (`share` с `ReplaySubject(1)`): следующие подписчики запрос не делают.
     * Ошибка кэш сбрасывает (`resetOnError`), чтобы подписчик получил новый
     * запрос, а не запомненный сбой; `shareReplay(1)` здесь неприменим —
     * он закэшировал бы сам сбой. При вызове {@link refreshKits$} кэш
     * сбрасывается и выполняется новый запрос.
     */
    private readonly kits$ = this.kitsRefresh$.pipe(
        switchMap(() =>
            this.http
                .get<{ kits?: IKitDefDto[] }>(`${this.baseUrl}/kitdefs`, {
                    context: new HttpContext().set(SKIP_ERROR_ALERT, true),
                })
                .pipe(map((response) => (response.kits ?? []).map(mapDtoToKitDef)))
        ),
        share<IKitDef[]>({
            connector: () => new ReplaySubject<IKitDef[]>(1),
            resetOnError: true,
            resetOnComplete: false,
            resetOnRefCountZero: false,
        })
    );

    /**
     * Получает список всех захваченных наборов с их метаданными и иконками.
     *
     * Результат кэшируется на всю сессию: повторная подписка запрос не делает.
     *
     * ⚠️ Требует права `kit:edit`. Ошибка не показывает общий алерт и не
     * подменяется пустым списком — она доходит до подписчика, поэтому
     * право проверяют до подписки, а состояние ошибки рисует сам вызывающий код.
     *
     * @returns Observable с массивом наборов.
     */
    public getKits$(): Observable<IKitDef[]> {
        return this.kits$;
    }

    /**
     * Сбрасывает кэш списка наборов и инициирует новый запрос к API.
     *
     * Подписчики, использующие {@link getKits$}, автоматически получат
     * актуальный список. Вызывают после успешного изменения набора —
     * сами методы изменения список не перечитывают.
     */
    public refreshKits$(): void {
        this.kitsRefresh$.next(undefined);
    }

    /**
     * Обновляет отображаемые метаданные набора: название и/или категорию.
     *
     * Каждое поле запроса необязательно: отсутствующее поле сервер оставляет
     * без изменения, поэтому в `request` кладут только изменённое. Код набора
     * в тело не попадает — он приходит в пути. Сервер пишет только названные
     * поля и `updated_at`; `code`, `items` и `created_at` остаются игровыми.
     *
     * ⚠️ Требует права `kit:edit`. Ошибку обрабатывает вызывающий код:
     * 400 — пустой код, пустое название или неизвестная категория,
     * 404 — набор ни разу не захвачен игрой (vsservice не создаёт записи).
     *
     * @param code Код захваченного набора.
     * @param request Изменяемые поля: `title` и/или `category`.
     * @returns Observable с набором после изменения.
     */
    public updateKit$(code: string, request: IUpdateKitRequest): Observable<IKitDef> {
        return this.http
            .patch<{ kit: IKitDefDto }>(`${this.baseUrl}/kitdefs/${encodeURIComponent(code)}`, request)
            .pipe(map((response) => mapDtoToKitDef(response.kit)));
    }

    /**
     * Удаляет одну позицию из состава набора по её индексу.
     *
     * Индекс — позиция в списке `items` ровно в том порядке, в котором его
     * вернул {@link getKits$}. Коды позиций повторяются, поэтому адресация
     * идёт по индексу, а не по `game_code`. Снимки атрибутов остальных
     * позиций сохраняются: именно поэтому удаление точечное, а не замена
     * всего списка.
     *
     * ⚠️ Требует права `kit:edit`. Ошибку обрабатывает вызывающий код:
     * 412 — удаление последней позиции (пустой набор считается отсутствующим,
     * письмо без содержимого существовать не должно), 400 — пустой код или
     * индекс вне диапазона, 404 — набор ни разу не захвачен.
     *
     * @param code Код захваченного набора.
     * @param index Позиция в списке `items`, отсчёт от нуля.
     * @returns Observable с набором после удаления.
     */
    public removeKitItem$(code: string, index: number): Observable<IKitDef> {
        return this.http
            .post<{ kit: IKitDefDto }>(`${this.baseUrl}/kitdefs/${encodeURIComponent(code)}/items/${index}:remove`, {})
            .pipe(map((response) => mapDtoToKitDef(response.kit)));
    }
}
