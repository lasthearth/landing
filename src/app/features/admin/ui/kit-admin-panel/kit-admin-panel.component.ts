import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { IKitDef, IUpdateKitRequest, KitCategory, KitdefService } from '@entities/kitdef';
import { UserService } from '@entities/user';
import { GrpcCode } from '@shared/lib/grpc-code.constant';
import { grpcStatusCode } from '@shared/lib/grpc-status-code.function';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { AdminListSkeletonComponent } from '@shared/ui/skeletons';
import { SearchFieldComponent } from '@shared/ui/search-field';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';
import { catchError, EMPTY, finalize, Subscription } from 'rxjs';
import { KIT_CATEGORIES, KIT_CATEGORY_LABEL_KEYS } from '../../config/kit-category.constant';
import { filterKits } from '../../lib/filter-kits.function';

/**
 * Ключи переводов типов позиции набора (`kitdef.v1.KitItem.type`).
 *
 * Сервер хранит тип свободной строкой, поэтому неизвестное значение
 * выводится как есть, а не подменяется подписью по умолчанию.
 */
const ITEM_TYPE_LABEL_KEYS: Record<string, string> = {
    item: 'admin.kits.itemType.item',
    block: 'admin.kits.itemType.block',
};

/**
 * Панель управления захваченными наборами в админке.
 *
 * Набор пишет игра при выдаче кита: `code`, `items` и `created_at` остаются
 * игровыми. Админка правит только отображаемые метаданные (`title`, `category`)
 * через `PATCH /v1/kitdefs/{code}` и точечно удаляет позицию состава через
 * `POST /v1/kitdefs/{code}/items/{index}:remove`. Индекс позиции берётся из
 * ответа `ListKits`, поэтому после каждого удаления список перечитывается:
 * коды позиций повторяются, и адресация по коду невозможна.
 *
 * `attr_snapshot` в контракт не входит: панель его не читает и не отправляет.
 */
@Component({
    selector: 'app-kit-admin-panel',
    standalone: true,
    imports: [
        AdminListSkeletonComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        ImageLoaderComponent,
        LHInputComponent,
        ReactiveFormsModule,
        SearchFieldComponent,
        TuiIcon,
        TuiLoader,
        TranslatePipe,
    ],
    templateUrl: './kit-admin-panel.component.html',
    styleUrl: './kit-admin-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitAdminPanelComponent implements OnInit {
    /**
     * Сервис захваченных наборов.
     */
    private readonly kitdefService = inject(KitdefService);

    /**
     * Сервис уведомлений о результате запроса.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис пользователя: право на раздел проверяется до первого запроса.
     */
    private readonly userService = inject(UserService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Признак уничтожения компонента.
     *
     * Запрос удаления может завершиться после закрытия вкладки: перечитывать
     * список и переподписываться в этот момент уже не на что.
     */
    private destroyed = false;

    /**
     * Подписка на общий поток списка наборов.
     *
     * Поток `getKits$()` кэшируется на сессию и переживает обновления списка,
     * поэтому подписка одна: повторная нужна только после ошибки, которая
     * закрывает подписчика (`resetOnError` при этом сбрасывает кэш).
     */
    private kitsSubscription: Subscription | null = null;

    /**
     * Категории набора, доступные администратору.
     */
    protected readonly categories: KitCategory[] = [...KIT_CATEGORIES];

    /**
     * Загруженные наборы; `null` — список ещё ни разу не пришёл.
     */
    protected readonly kits = signal<IKitDef[] | null>(null);

    /**
     * Признак загрузки списка.
     */
    protected readonly loading = signal<boolean>(false);

    /**
     * Признак ошибки загрузки списка.
     */
    protected readonly loadFailed = signal<boolean>(false);

    /**
     * Признак того, что у администратора нет права на раздел.
     */
    protected readonly denied = signal<boolean>(false);

    /**
     * Код набора, запрос по которому выполняется сейчас.
     */
    protected readonly busyCode = signal<string | null>(null);

    /**
     * Формы метаданных набора по его коду.
     */
    protected readonly forms = signal<ReadonlyMap<string, FormGroup<KitForm>>>(new Map());

    /**
     * Категории для фильтра.
     */
    protected readonly categoryFilters: readonly (KitCategory | 'all')[] = ['all', ...KIT_CATEGORIES];

    /**
     * Текст поиска: код, название или код предмета внутри набора.
     */
    protected readonly query = signal('');

    /**
     * Выбранная категория.
     */
    protected readonly categoryFilter = signal<KitCategory | 'all'>('all');

    /**
     * Раскрытые наборы. По умолчанию все свёрнуты в строку — так длинный список читается целиком.
     */
    protected readonly expanded = signal<ReadonlySet<string>>(new Set());

    /**
     * Наборы после поиска и фильтра.
     */
    protected readonly visibleKits = computed(() => filterKits(this.kits() ?? [], this.query(), this.categoryFilter()));

    /**
     * Сколько наборов в каждой категории — числа на чипах.
     */
    protected readonly categoryCounts = computed(() => {
        const counts = new Map<KitCategory | 'all', number>([['all', this.kits()?.length ?? 0]]);
        for (const kit of this.kits() ?? []) {
            counts.set(kit.category, (counts.get(kit.category) ?? 0) + 1);
        }
        return counts;
    });

    /**
     * Раскрыты ли все видимые наборы — от этого зависит подпись общей кнопки.
     */
    protected readonly allExpanded = computed(() => {
        const visible = this.visibleKits();
        return visible.length > 0 && visible.every((kit) => this.expanded().has(kit.code));
    });

    /**
     * Конструктор. Запоминает уничтожение компонента.
     */
    public constructor() {
        this.destroyRef.onDestroy(() => (this.destroyed = true));
    }

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        // `GET /v1/kitdefs` закрыт правом `kit:edit` и читается тихо: посетитель
        // без права не должен получить алерт, поэтому запрос не уходит вовсе.
        if (!this.userService.roles.includes('admin')) {
            this.denied.set(true);

            return;
        }

        this.loading.set(true);
        // При каждом открытии вкладки список перечитывается: игра могла
        // перезаписать состав и категорию набора, название при этом сохраняется.
        this.kitdefService.refreshKits$();
        this.subscribeToKits();
    }

    /**
     * Перечитывает список наборов с сервера.
     */
    protected reload(): void {
        this.loading.set(true);
        this.loadFailed.set(false);
        this.kitdefService.refreshKits$();
        this.subscribeToKits();
    }

    /**
     * Раскрывает или сворачивает набор.
     *
     * @param code Код набора.
     */
    protected toggleKit(code: string): void {
        this.expanded.update((current) => {
            const next = new Set(current);
            if (!next.delete(code)) {
                next.add(code);
            }
            return next;
        });
    }

    /**
     * Раскрывает все видимые наборы или сворачивает все.
     */
    protected toggleAll(): void {
        this.expanded.set(this.allExpanded() ? new Set() : new Set(this.visibleKits().map((kit) => kit.code)));
    }

    /**
     * Возвращает локализованное название категории набора.
     *
     * @param category Категория набора.
     * @returns Локализованная строка.
     */
    protected categoryLabel(category: KitCategory): string {
        return this.i18n.translate(KIT_CATEGORY_LABEL_KEYS[category]);
    }

    /**
     * Возвращает локализованное название типа позиции набора.
     *
     * @param type Тип позиции из ответа сервера (`item`, `block`).
     * @returns Локализованная строка или исходное значение для неизвестного типа.
     */
    protected itemTypeLabel(type: string): string {
        const key = ITEM_TYPE_LABEL_KEYS[type];

        return key ? this.i18n.translate(key) : type;
    }

    /**
     * Функция отображения категории в выпадающем списке.
     */
    protected readonly categoryDisplay = (category: KitCategory): string => this.categoryLabel(category);

    /**
     * Проверяет, можно ли сохранить метаданные набора.
     *
     * Сохранение доступно, только если администратор что-то изменил и не
     * очистил название: пустое название сервер отклоняет с 400.
     *
     * @param kit Набор.
     * @returns true, если запрос на изменение нужен и допустим.
     */
    protected canSave(kit: IKitDef): boolean {
        const form = this.forms().get(kit.code);

        if (!form || this.isTitleCleared(kit)) {
            return false;
        }

        const patch = this.buildPatch(kit, form);

        return patch.title !== undefined || patch.category !== undefined;
    }

    /**
     * Проверяет, очистил ли администратор название набора.
     *
     * @param kit Набор.
     * @returns true, если название было непустым и стало пустым.
     */
    protected isTitleCleared(kit: IKitDef): boolean {
        const form = this.forms().get(kit.code);

        return !!form && form.controls.title.value.trim() === '' && kit.title.trim() !== '';
    }

    /**
     * Сохраняет изменённые метаданные набора.
     *
     * На сервер уходит только то поле, которое администратор действительно
     * изменил: отсутствующее поле `PATCH /v1/kitdefs/{code}` оставляет прежним.
     *
     * @param kit Набор.
     */
    protected saveKit(kit: IKitDef): void {
        const form = this.forms().get(kit.code);

        if (!form || !this.canSave(kit)) {
            return;
        }

        this.busyCode.set(kit.code);

        this.kitdefService
            .updateKit$(kit.code, this.buildPatch(kit, form))
            .pipe(
                this.requestStatus.handleSuccess(this.i18n.translate('admin.kits.savedSuccess')),
                catchError((error: unknown) => {
                    this.requestStatus.showError(this.i18n.translate(this.updateErrorKey(error)));

                    // 404 означает, что набор больше не захвачен: список устарел
                    // и его нужно перечитать. Остальные ошибки правятся на месте.
                    if (this.statusOf(error) === 404) {
                        this.reload();
                    }

                    return EMPTY;
                }),
                finalize(() => this.busyCode.set(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.reload());
    }

    /**
     * Удаляет позицию из состава набора после подтверждения.
     *
     * @param kit Набор.
     * @param index Позиция в списке `items` из ответа `ListKits`.
     */
    protected removeItem(kit: IKitDef, index: number): void {
        const item = kit.items[index];

        if (!item) {
            return;
        }

        this.confirmDialog
            .open({
                title: this.i18n.translate('admin.kits.removeItemTitle'),
                text: this.i18n.translate('admin.kits.removeItemText', {
                    item: item.gameCode,
                    kit: kit.title || kit.code,
                }),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.busyCode.set(kit.code);

                this.kitdefService
                    .removeKitItem$(kit.code, index)
                    .pipe(
                        this.requestStatus.handleSuccess(this.i18n.translate('admin.kits.removedSuccess')),
                        catchError((error: unknown) => {
                            this.requestStatus.showError(this.i18n.translate(this.removeErrorKey(error)));

                            return EMPTY;
                        }),
                        // Индексы позиций живут только до следующего ответа
                        // `ListKits`, поэтому список перечитывается и после
                        // успеха, и после ошибки.
                        finalize(() => {
                            this.busyCode.set(null);
                            this.reload();
                        }),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe();
            });
    }

    /**
     * Собирает тело запроса на изменение метаданных набора.
     *
     * В тело попадают только изменённые поля: пустое название не отправляется,
     * потому что `PATCH` трактует отсутствие поля как «оставить прежнее»,
     * а пустую строку — как ошибку 400.
     *
     * @param kit Набор до правки.
     * @param form Форма метаданных набора.
     * @returns Тело запроса без кода набора.
     */
    private buildPatch(kit: IKitDef, form: FormGroup<KitForm>): IUpdateKitRequest {
        const patch: IUpdateKitRequest = {};
        const title = form.controls.title.value.trim();

        if (title && title !== kit.title.trim()) {
            patch.title = title;
        }

        const category = form.controls.category.value;

        if (category && category !== kit.category) {
            patch.category = category;
        }

        return patch;
    }

    /**
     * Подписывается на общий поток списка наборов.
     *
     * Повторная подписка нужна после ошибки: она закрывает подписчика,
     * а кэш при этом сброшен, поэтому новая подписка делает новый запрос.
     */
    private subscribeToKits(): void {
        if (this.destroyed) {
            return;
        }

        if (this.kitsSubscription && !this.kitsSubscription.closed) {
            return;
        }

        this.kitsSubscription = this.kitdefService
            .getKits$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (kits) => {
                    this.applyKits(kits);
                    this.loadFailed.set(false);
                    this.loading.set(false);
                },
                error: () => {
                    this.loadFailed.set(true);
                    this.loading.set(false);
                },
            });
    }

    /**
     * Записывает загруженный список и пересоздаёт формы метаданных.
     *
     * @param kits Наборы из ответа `ListKits`.
     */
    private applyKits(kits: IKitDef[]): void {
        const forms = new Map<string, FormGroup<KitForm>>();

        for (const kit of kits) {
            forms.set(kit.code, this.createKitForm(kit));
        }

        this.kits.set(kits);
        this.forms.set(forms);
    }

    /**
     * Создаёт форму метаданных одного набора.
     *
     * Валидаторы не ставятся: название проверяется при сборке тела запроса,
     * чтобы смену категории можно было сохранить у набора без названия.
     *
     * @param kit Набор.
     * @returns Форма с текущими значениями набора.
     */
    private createKitForm(kit: IKitDef): FormGroup<KitForm> {
        return new FormGroup<KitForm>({
            title: new FormControl<string>(kit.title, { nonNullable: true }),
            category: new FormControl<KitCategory>(kit.category, { nonNullable: true }),
        });
    }

    /**
     * Возвращает ключ перевода ошибки сохранения метаданных.
     *
     * @param error Ошибка из HttpClient.
     * @returns Ключ перевода для уведомления.
     */
    private updateErrorKey(error: unknown): string {
        switch (this.statusOf(error)) {
            case 404:
                return 'admin.kits.notFoundError';
            case 403:
                return 'admin.kits.forbiddenError';
            case 400:
                return 'admin.kits.invalidError';
            default:
                return 'admin.kits.saveError';
        }
    }

    /**
     * Возвращает ключ перевода ошибки удаления позиции.
     *
     * FAILED_PRECONDITION приходит и как 412, и как 400, поэтому состояние
     * уточняется по числовому коду `google.rpc.Status` в теле ответа.
     *
     * @param error Ошибка из HttpClient.
     * @returns Ключ перевода для уведомления.
     */
    private removeErrorKey(error: unknown): string {
        const status = this.statusOf(error);
        const code = grpcStatusCode(error);

        if (status === 412 || code === GrpcCode.failedPrecondition) {
            return 'admin.kits.lastItemError';
        }

        switch (status) {
            case 404:
                return 'admin.kits.notFoundError';
            case 403:
                return 'admin.kits.forbiddenError';
            // 400 у удаления означает пустой код или индекс вне диапазона:
            // и то, и другое лечится перечитыванием списка.
            case 400:
                return 'admin.kits.indexOutOfRangeError';
            default:
                return 'admin.kits.removeError';
        }
    }

    /**
     * Возвращает HTTP-статус ошибки.
     *
     * @param error Ошибка из HttpClient.
     * @returns Статус ответа или 0, если это не ответ сервера.
     */
    private statusOf(error: unknown): number {
        return error instanceof HttpErrorResponse ? error.status : 0;
    }
}

/**
 * Тип формы метаданных набора.
 */
interface KitForm {
    title: FormControl<string>;
    category: FormControl<KitCategory>;
}
