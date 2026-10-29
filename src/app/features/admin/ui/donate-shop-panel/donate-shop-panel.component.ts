import { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { RequestStatusService } from '@core/services/request-status.service';
import {
    DonateService,
    IAbilityItem,
    ICreateShopItemRequest,
    IKitEntryDto,
    IShopItem,
    IUpdateShopItemRequest,
    SHOP_SECTIONS,
    ShopCategory,
    ShopItemType,
} from '@entities/donate';
import { IKitDef, KitdefService } from '@entities/kitdef';
import { MediaService } from '@entities/media';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { TuiHint, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { AbilityTagComponent } from '@shared/ui/ability-tag/ability-tag.component';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { ErrorStateComponent } from '@shared/ui/error-state';
import { TuiFile, TuiFiles, TuiFilesComponent } from '@taiga-ui/kit';
import { I18nService, TranslatePipe, AmountPipe } from '@core/i18n';
import { catchError, EMPTY, finalize, map, Observable, startWith, Subject, Subscription, switchMap, timer } from 'rxjs';
import { LocalStorageService } from '@core/services/local-storage.service';
import { SearchFieldComponent } from '@shared/ui/search-field';
import { ADMIN_SHOP_VIEW_STORAGE_KEY } from '../../config/admin-shop-view-storage-key.constant';
import { KIT_CATEGORIES, KIT_CATEGORY_LABEL_KEYS } from '../../config/kit-category.constant';
import { filterShopItems } from '../../lib/filter-shop-items.function';
import { sortShopItems } from '../../lib/sort-shop-items.function';
import { AdminListView } from '../../model/admin-list-view.type';
import { ShopSort } from '../../model/shop-sort.type';
import { ShopStatusFilter } from '../../model/shop-status-filter.type';

/**
 * Тип товара, который принимает сервер.
 *
 * Магазин продаёт только захваченные наборы, поэтому тип фиксирован:
 * товар из одной позиции — это набор из одного предмета, захваченный
 * тем же способом. Любое другое значение `item_type` сервер отклоняет
 * с 400 "item-type shop entries are disabled".
 */
const KIT_ITEM_TYPE: ShopItemType = 'ITEM_TYPE_KIT';

/**
 * Панель управления донат-магазином в админке.
 *
 * Позволяет просматривать список товаров, создавать новые,
 * редактировать и удалять существующие. Товар всегда привязан
 * к захваченному игрой набору: код выбирается из списка `GET /v1/kitdefs`,
 * а не вводится вручную.
 */
@Component({
    selector: 'app-donate-shop-panel',
    standalone: true,
    imports: [
        AmountPipe,
        ReactiveFormsModule,
        FormsModule,
        AsyncPipe,
        LHInputComponent,
        TuiIcon,
        TuiHint,
        TuiLoader,
        TuiFiles,
        TuiFilesComponent,
        TuiFile,
        MarketGridSkeletonComponent,
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
        AbilityTagComponent,
        EmptyStateComponent,
        ErrorStateComponent,
        ImageLoaderComponent,
        SearchFieldComponent,
        TranslatePipe,
    ],
    templateUrl: './donate-shop-panel.component.html',
    styleUrl: './donate-shop-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonateShopPanelComponent implements OnInit {
    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис захваченных наборов: источник кодов для товара магазина.
     */
    private readonly kitdefService = inject(KitdefService);

    /**
     * Сервис загрузки медиафайлов.
     */
    private readonly mediaService = inject(MediaService);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog = inject(ConfirmDialogService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Хранилище браузера: помнит выбранный вид списка.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * Подписка на общий поток списка товаров.
     *
     * Поток кэшируется на сессию и переживает обновления, поэтому подписка
     * одна; повторная нужна только после ошибки, которая закрывает подписчика.
     */
    private itemsSubscription: Subscription | null = null;

    /**
     * Подписка на общий поток списка захваченных наборов.
     */
    private kitsSubscription: Subscription | null = null;

    /**
     * Индекс активной внутренней вкладки: 0 — список, 1 — форма.
     */
    protected activeTabIndex = signal(0);

    /**
     * Режим формы: создание или редактирование.
     */
    protected isEditMode = signal(false);

    /**
     * Идентификатор редактируемого товара.
     */
    protected editingItemId = signal<string | null>(null);

    /**
     * Признак выполнения запроса сохранения товара.
     */
    protected isLoading = signal(false);

    /**
     * Идентификатор товара, запрос доступности по которому выполняется сейчас.
     */
    protected readonly busyItemId = signal<string | null>(null);

    /**
     * Список товаров магазина; `null` — список ещё ни разу не пришёл.
     */
    protected readonly shopItems = signal<IShopItem[] | null>(null);

    /**
     * Категории для фильтра — те же, что у наборов.
     */
    protected readonly categoryFilters: readonly (ShopCategory | 'all')[] = ['all', ...KIT_CATEGORIES];

    /**
     * Варианты фильтра по видимости.
     */
    protected readonly statusFilters: readonly ShopStatusFilter[] = ['all', 'available', 'hidden'];

    /**
     * Варианты сортировки.
     */
    protected readonly sorts: readonly ShopSort[] = ['newest', 'oldest', 'updated', 'name', 'price'];

    /**
     * Текст поиска по названию, коду набора и разделу.
     */
    protected readonly query = signal('');

    /**
     * Выбранная категория.
     */
    protected readonly categoryFilter = signal<ShopCategory | 'all'>('all');

    /**
     * Выбранная видимость.
     */
    protected readonly statusFilter = signal<ShopStatusFilter>('all');

    /**
     * Показывать только товары со скидкой.
     */
    protected readonly discountOnly = signal(false);

    /**
     * Порядок списка.
     */
    protected readonly sort = signal<ShopSort>('newest');

    /**
     * Вид списка: компактные строки (по умолчанию) или карточки. Запоминается в браузере.
     */
    protected readonly view = signal<AdminListView>(
        this.storage.getItem<AdminListView>(ADMIN_SHOP_VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'list'
    );

    /**
     * Товары после фильтров и сортировки.
     */
    protected readonly visibleItems = computed(() =>
        sortShopItems(
            filterShopItems(this.shopItems() ?? [], {
                query: this.query(),
                category: this.categoryFilter(),
                status: this.statusFilter(),
                discountOnly: this.discountOnly(),
            }),
            this.sort()
        )
    );

    /**
     * Включён ли хоть один фильтр — тогда показывается «Сбросить».
     */
    protected readonly hasFilters = computed(
        () =>
            this.query().trim() !== '' ||
            this.categoryFilter() !== 'all' ||
            this.statusFilter() !== 'all' ||
            this.discountOnly()
    );

    /**
     * Сколько товаров в каждой категории — числа на чипах.
     */
    protected readonly categoryCounts = computed(() => {
        const counts = new Map<ShopCategory | 'all', number>([['all', this.shopItems()?.length ?? 0]]);
        for (const item of this.shopItems() ?? []) {
            counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
        }
        return counts;
    });

    /**
     * Признак загрузки списка товаров.
     */
    protected readonly itemsLoading = signal<boolean>(false);

    /**
     * Признак ошибки загрузки списка товаров.
     */
    protected readonly itemsLoadFailed = signal<boolean>(false);

    /**
     * Захваченные наборы — источник кодов для поля «Код набора».
     */
    protected readonly kits = signal<IKitDef[]>([]);

    /**
     * Признак загрузки списка наборов.
     */
    protected readonly kitsLoading = signal<boolean>(false);

    /**
     * Признак ошибки загрузки списка наборов.
     *
     * При ошибке вместо выбора из списка администратор вводит код вручную:
     * сервер всё равно проверяет, что набор захвачен, и отвечает 404.
     */
    protected readonly kitsLoadFailed = signal<boolean>(false);

    /**
     * Коды захваченных наборов для выпадающего списка.
     */
    protected readonly kitCodes = computed<string[]>(() => this.kits().map((kit) => kit.code));

    /**
     * Наборы по коду для подписей и категории выбранного кода.
     */
    private readonly kitByCode = computed<Map<string, IKitDef>>(
        () => new Map(this.kits().map((kit) => [kit.code, kit]))
    );

    /**
     * URL превью выбранного изображения товара.
     */
    protected imagePreviewUrl = signal<string | null>(null);

    /**
     * Признак попытки сохранить товар с пустым составом.
     *
     * Сервер отвечает 400 `kit must have at least one entry`, поэтому проверка
     * делается на форме. Пустая форма нового товара ошибкой не подсвечивается:
     * сообщение появляется только после нажатия кнопки сохранения.
     */
    protected readonly entriesError = signal<boolean>(false);

    /**
     * Признак того, что товар с выбранным кодом уже существует.
     *
     * `donate_shop_items` несёт уникальный индекс по `code`, но `CreateShopItem`
     * отвечает на повтор общим 500 `failed to create shop item`, а не 409,
     * поэтому признак выставляется по статусу 500 при создании.
     */
    protected readonly codeTaken = signal<boolean>(false);

    /**
     * Признак правки состава администратором после автозаполнения из набора.
     */
    private entriesEditedByAdmin = false;

    /**
     * Признак программного заполнения состава: подавляет подписку на правки.
     */
    private fillingEntries = false;

    /**
     * Подписки на изменения файлов entry набора.
     */
    private readonly entryImageSubscriptions = new Map<FormControl<File | null>, Subscription>();

    /**
     * Форма создания/редактирования товара.
     *
     * `item_type` в форму не входит: сервер принимает только `ITEM_TYPE_KIT`.
     * `description` — служебное поле без ввода: значение переносится из товара
     * и возвращается на сервер как есть, чтобы обновление не затирало описание.
     */
    protected readonly form = new FormGroup({
        name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        description: new FormControl<string>('', { nonNullable: true }),
        price: new FormControl<string>('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/^\d+\.?\d*$/)],
        }),
        code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        is_available: new FormControl<boolean>(true, { nonNullable: true }),
        has_discount: new FormControl<boolean>(false, { nonNullable: true }),
        discount_percent: new FormControl<number>(0, { nonNullable: true }),
        section: new FormControl<string>('', { nonNullable: true }),
        image: new FormControl<File | null>(null),
        entries: new FormArray<FormGroup<KitEntryForm>>([]),
        privileges: new FormArray<FormGroup<AbilityForm>>([]),
    });

    /**
     * Текущее значение формы для предпросмотра.
     */
    private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
        initialValue: this.form.getRawValue(),
    });

    /**
     * Поток неудачной загрузки файла изображения товара.
     */
    protected readonly failedFile$: Subject<File | null> = new Subject<File | null>();

    /**
     * Поток загрузки файла изображения товара.
     */
    protected readonly loadingFile$: Subject<File | null> = new Subject<File | null>();

    /**
     * Поток успешно выбранного файла изображения товара.
     */
    protected readonly loadedFile$: Observable<File | null> = this.form.controls.image.valueChanges.pipe(
        switchMap((file) => this.processFile(file, this.loadingFile$, this.failedFile$))
    );

    /**
     * Данные для предпросмотра карточки товара.
     */
    protected readonly previewItem = computed(() => {
        const values = this.formValue();
        const entries = this.entriesArray.getRawValue();
        const privileges = this.privilegesArray.getRawValue();
        const imageUrl = this.imagePreviewUrl() ?? '';

        return {
            name: values.name || this.i18n.translate('admin.shop.defaultItemName'),
            price: values.price || '0',
            code: values.code || '',
            isAvailable: values.is_available ?? true,
            hasDiscount: values.has_discount ?? false,
            discountPercent: values.discount_percent ?? 0,
            imageUrl,
            entries: entries.map((entry, index) => ({
                name: entry.name || this.i18n.translate('admin.shop.defaultPositionName', { number: index + 1 }),
                description: entry.description,
                quantity: entry.quantity,
                imageUrl: entry.image_url ?? '',
            })),
            privileges: privileges.map((ability) => ({
                icon: ability.icon || '@tui.circle-help',
                text: ability.text || this.i18n.translate('admin.shop.defaultAbility'),
            })),
        };
    });

    /**
     * Категория набора, выбранного в поле «Код набора».
     *
     * Пустой код или незагруженный список дают категорию по умолчанию —
     * сервер хранит её тем же значением `kit`.
     */
    protected readonly previewCategory = computed<ShopCategory>(
        () => this.kitByCode().get(this.formValue().code ?? '')?.category ?? 'kit'
    );

    /**
     * Эффективная цена товара с учётом скидки для предпросмотра.
     */
    protected readonly previewEffectivePrice = computed(() => {
        const price = Number(this.previewItem().price) || 0;
        const percent = this.previewItem().hasDiscount ? this.previewItem().discountPercent : 0;

        if (!percent || price <= 0) {
            return price.toString();
        }

        return (price * (1 - percent / 100)).toFixed(2).replace(/\.00$/, '');
    });

    /**
     * Возвращает FormArray entries.
     */
    protected get entriesArray(): FormArray<FormGroup<KitEntryForm>> {
        return this.form.controls.entries;
    }

    /**
     * Возвращает FormArray возможностей товара.
     */
    protected get privilegesArray(): FormArray<FormGroup<AbilityForm>> {
        return this.form.controls.privileges;
    }

    /**
     * Конструктор.
     *
     * Подписывается на выбор файла изображения товара, на смену кода набора
     * и на правки состава.
     */
    public constructor() {
        this.form.controls.image.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((file) => {
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = () => this.imagePreviewUrl.set(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                this.imagePreviewUrl.set(null);
            }
        });

        // Состав подставляется из выбранного набора. В режиме редактирования
        // позиции принадлежат товару, поэтому смена кода их не трогает.
        this.form.controls.code.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((code) => {
            this.codeTaken.set(false);

            if (this.isEditMode()) {
                return;
            }

            this.applyKitEntries(code);
        });

        // Правка состава руками — решение администратора: без подтверждения
        // её не перетирает даже выбор другого набора.
        this.entriesArray.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            if (!this.fillingEntries) {
                this.entriesEditedByAdmin = true;
            }
        });
    }

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        this.loadItems();
        this.loadKits();
    }

    /**
     * Переключает вид списка и запоминает выбор.
     *
     * @param view Новый вид.
     */
    protected setView(view: AdminListView): void {
        this.view.set(view);
        this.storage.setItem(ADMIN_SHOP_VIEW_STORAGE_KEY, view);
    }

    /**
     * Сбрасывает все фильтры списка.
     */
    protected resetFilters(): void {
        this.query.set('');
        this.categoryFilter.set('all');
        this.statusFilter.set('all');
        this.discountOnly.set(false);
    }

    /**
     * Возвращает локализованное название категории набора.
     *
     * @param category Категория набора.
     * @returns Локализованная строка.
     */
    protected categoryLabel(category: ShopCategory): string {
        return this.i18n.translate(KIT_CATEGORY_LABEL_KEYS[category]);
    }

    /**
     * Функция отображения кода набора в выпадающем списке.
     */
    protected readonly kitDisplay = (code: string): string => this.kitLabel(code);

    /**
     * Варианты поля «Раздел»: пустая строка — без раздела.
     */
    protected readonly sectionKeys: string[] = ['', ...SHOP_SECTIONS.map((section) => section.key)];

    /**
     * Функция отображения раздела в выпадающем списке.
     *
     * Ключ, которого нет в `SHOP_SECTIONS` (раздел удалили из кода),
     * показывается как есть, чтобы его можно было заметить и сменить.
     */
    protected readonly sectionDisplay = (key: string): string => {
        if (!key) {
            return this.i18n.translate('admin.shop.sectionNone');
        }
        const section = SHOP_SECTIONS.find((item) => item.key === key);
        return section ? this.i18n.translate(section.labelKey) : key;
    };

    /**
     * Перечитывает список товаров с сервера.
     */
    protected reloadItems(): void {
        this.loadItems();
    }

    /**
     * Перечитывает список захваченных наборов с сервера.
     */
    protected reloadKits(): void {
        this.loadKits();
    }

    /**
     * Переключается на вкладку создания товара.
     */
    protected startCreate(): void {
        this.isEditMode.set(false);
        this.editingItemId.set(null);
        this.resetForm();
        this.activeTabIndex.set(1);
        // Набор могли захватить в игре после открытия панели.
        this.loadKits();
    }

    /**
     * Переключается на редактирование выбранного товара.
     *
     * @param item Товар для редактирования.
     */
    protected startEdit(item: IShopItem): void {
        this.isEditMode.set(true);
        this.editingItemId.set(item.id);
        this.imagePreviewUrl.set(item.imageUrl);
        this.codeTaken.set(false);
        this.entriesError.set(false);

        this.form.patchValue({
            name: item.name,
            description: item.description,
            price: item.price,
            code: item.code,
            is_available: item.isAvailable,
            has_discount: item.hasDiscount ?? false,
            discount_percent: item.discountPercent ?? 0,
            section: item.section ?? '',
        });

        this.privilegesArray.clear();

        item.privileges?.forEach((ability) => {
            this.privilegesArray.push(this.createAbilityForm(ability));
        });

        this.replaceEntries(item.entries ?? []);

        this.activeTabIndex.set(1);
        this.loadKits();
    }

    /**
     * Заполняет состав из выбранного захваченного набора.
     *
     * Выполняется только при создании товара: при редактировании позиции
     * принадлежат товару, и код их не заменяет. Состав набора — черновик:
     * позицию можно переименовать или поменять количество. Позиции, которые
     * администратор уже правил руками, заменяются только с подтверждением.
     *
     * @param code Код набора, выбранный в поле «Код набора».
     */
    private applyKitEntries(code: string): void {
        const kit = this.kitByCode().get(code);

        if (!kit || kit.items.length === 0) {
            return;
        }

        if (this.entriesArray.length > 0 && this.entriesEditedByAdmin) {
            this.confirmDialog
                .open({
                    title: this.i18n.translate('admin.shop.replaceEntriesTitle'),
                    text: this.i18n.translate('admin.shop.replaceEntriesText', {
                        name: kit.title || kit.code,
                    }),
                })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((confirmed) => {
                    if (confirmed) {
                        this.fillEntriesFromKit(kit);
                    }
                });

            return;
        }

        this.fillEntriesFromKit(kit);
    }

    /**
     * Заменяет позиции состава значениями из набора.
     *
     * @param kit Выбранный захваченный набор.
     */
    private fillEntriesFromKit(kit: IKitDef): void {
        this.replaceEntries(
            kit.items.map((item) => ({
                gameCode: item.gameCode,
                name: item.gameCode,
                quantity: item.quantity,
                imageUrl: item.imageUrl,
            }))
        );
        this.entriesError.set(false);
    }

    /**
     * Заменяет состав на форме и сбрасывает признак ручной правки.
     *
     * @param entries Позиции состава в порядке ответа сервера.
     */
    private replaceEntries(
        entries: { gameCode?: string; name: string; description?: string; quantity: number; imageUrl?: string }[]
    ): void {
        this.fillingEntries = true;
        this.entriesArray.clear();
        this.entryImageSubscriptions.forEach((sub) => sub.unsubscribe());
        this.entryImageSubscriptions.clear();
        entries.forEach((entry) => this.entriesArray.push(this.createEntryForm(entry)));
        this.fillingEntries = false;
        this.entriesEditedByAdmin = false;
    }

    /**
     * Возвращается на вкладку списка.
     */
    protected backToList(): void {
        this.activeTabIndex.set(0);
        this.resetForm();
    }

    /**
     * Удаляет позицию из набора.
     *
     * @param index Индекс позиции.
     */
    protected removeEntry(index: number): void {
        const control = this.entriesArray.at(index).controls.image;
        const subscription = this.entryImageSubscriptions.get(control);
        if (subscription) {
            subscription.unsubscribe();
            this.entryImageSubscriptions.delete(control);
        }
        this.entriesArray.removeAt(index);
    }

    /**
     * Добавляет пустую возможность в товар.
     */
    protected addAbility(): void {
        this.privilegesArray.push(this.createAbilityForm());
    }

    /**
     * Удаляет возможность из товара.
     *
     * @param index Индекс возможности.
     */
    protected removeAbility(index: number): void {
        this.privilegesArray.removeAt(index);
    }

    /**
     * Удаляет выбранный файл изображения товара.
     */
    protected removeFile(): void {
        this.form.controls.image.setValue(null);
    }

    /**
     * Удаляет выбранный файл изображения entry.
     *
     * @param index Индекс entry.
     */
    protected removeEntryFile(index: number): void {
        this.entriesArray.at(index).controls.image.setValue(null);
    }

    /**
     * Перестраивает порядок entries в FormArray после drag-and-drop.
     *
     * Вызывается и из списка позиций формы, и из сетки «Состав набора»
     * в предпросмотре: индексы обоих списков совпадают с FormArray.
     *
     * @param event Событие перетаскивания из Angular CDK.
     */
    protected dropEntry(event: Pick<CdkDragDrop<unknown>, 'previousIndex' | 'currentIndex'>): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }

        const control = this.entriesArray.at(event.previousIndex);
        this.entriesArray.removeAt(event.previousIndex);
        this.entriesArray.insert(event.currentIndex, control);
    }

    /**
     * Обрабатывает выбранный файл: эмулирует короткую загрузку,
     * отлавливает превышение размера и возвращает файл для отображения.
     *
     * @param file Выбранный файл.
     * @param loading$ {@link Subject} состояния загрузки.
     * @param failed$ {@link Subject} состояния ошибки.
     * @returns Observable с файлом или null.
     */
    protected processFile(
        file: File | null,
        loading$: Subject<File | null>,
        failed$: Subject<File | null>
    ): Observable<File | null> {
        failed$.next(null);

        if (!file) {
            return timer(0).pipe(map(() => null));
        }

        const maxSizeBytes = 10 * 1024 * 1024;

        if (file.size && file.size > maxSizeBytes) {
            failed$.next(file);
            return timer(0).pipe(map(() => null));
        }

        loading$.next(file);

        return timer(300).pipe(
            map(() => file),
            finalize(() => loading$.next(null))
        );
    }

    /**
     * Удаляет товар.
     *
     * Перед удалением показывает диалог подтверждения.
     *
     * @param item Товар для удаления.
     */
    protected deleteItem(item: IShopItem): void {
        this.confirmDialog
            .open({
                title: this.i18n.translate('admin.shop.deleteTitle'),
                text: this.i18n.translate('admin.shop.deleteText', { name: item.name }),
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.donateService
                    .deleteShopItem$(item.id)
                    .pipe(
                        this.requestStatus.handleError(),
                        this.requestStatus.handleSuccess(this.i18n.translate('admin.shop.deletedSuccess')),
                        // Ошибка уже показана handleError: переводим её в EMPTY,
                        // чтобы подписчик не получил unhandled exception.
                        catchError(() => EMPTY),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe(() => this.loadItems());
            });
    }

    /**
     * Меняет доступность товара одним действием.
     *
     * Скрытая запись остаётся в списке: его отдаёт админский эндпоинт, поэтому
     * скрытый товар можно найти и снова опубликовать. Перед запросом
     * показывается диалог подтверждения — состояние влияет на витрину.
     *
     * @param item Товар из списка.
     */
    protected toggleAvailability(item: IShopItem): void {
        const show = !item.isAvailable;

        this.confirmDialog
            .open({
                title: this.i18n.translate(show ? 'admin.shop.showTitle' : 'admin.shop.hideTitle'),
                text: this.i18n.translate(show ? 'admin.shop.showText' : 'admin.shop.hideText', {
                    name: item.name,
                }),
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.busyItemId.set(item.id);

                this.donateService
                    .updateShopItem$(item.id, this.buildAvailabilityRequest(item, show))
                    .pipe(
                        this.requestStatus.handleSuccess(
                            this.i18n.translate(show ? 'admin.shop.shownSuccess' : 'admin.shop.hiddenSuccess')
                        ),
                        catchError((error: unknown) => {
                            this.requestStatus.showError(this.saveErrorText(error));

                            return EMPTY;
                        }),
                        // Список перечитывается и после успеха, и после ошибки:
                        // бейдж доступности должен совпадать с сервером.
                        finalize(() => {
                            this.busyItemId.set(null);
                            this.loadItems();
                        }),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe();
            });
    }

    /**
     * Собирает запрос обновления, меняющий только доступность товара.
     *
     * `PUT` перезаписывает запись целиком, поэтому остальные поля возвращаются
     * на сервер в том виде, в котором их вернул список. `image_url` остаётся
     * пустым: по контракту это значит «сохранить текущее изображение».
     *
     * @param item Товар из списка.
     * @param isAvailable Новое значение доступности.
     * @returns Тело запроса обновления.
     */
    private buildAvailabilityRequest(item: IShopItem, isAvailable: boolean): IUpdateShopItemRequest {
        return {
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            code: item.code,
            item_type: KIT_ITEM_TYPE,
            is_available: isAvailable,
            has_discount: item.hasDiscount,
            discount_percent: item.hasDiscount ? item.discountPercent : undefined,
            image_url: '',
            entries: (item.entries ?? []).map((entry) => ({
                game_code: entry.gameCode,
                name: entry.name,
                description: entry.description,
                quantity: entry.quantity,
                image_url: entry.imageUrl,
            })),
            privileges: item.privileges ?? [],
            section: item.section ?? '',
        };
    }

    /**
     * Сохраняет товар (создание или обновление).
     */
    protected async saveItem(): Promise<void> {
        // Пустой состав сервер отклоняет с 400 `kit must have at least one entry`:
        // проверка выполняется на форме, до запроса.
        this.entriesError.set(this.entriesArray.length === 0);

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (this.entriesArray.length === 0) {
            this.requestStatus.showError(this.i18n.translate('admin.shop.entriesRequired'));
            return;
        }

        this.isLoading.set(true);

        try {
            const values = this.form.getRawValue();
            const imageUrl = await this.resolveImageUrl();
            const entries = await this.resolveEntries();
            const privileges = this.resolvePrivileges();

            if (this.isEditMode() && this.editingItemId()) {
                const request: IUpdateShopItemRequest = {
                    id: this.editingItemId()!,
                    name: values.name.trimEnd(),
                    description: values.description.trimEnd(),
                    price: values.price,
                    code: values.code.trimEnd(),
                    item_type: KIT_ITEM_TYPE,
                    is_available: values.is_available,
                    has_discount: values.has_discount,
                    discount_percent: values.has_discount ? values.discount_percent : undefined,
                    image_url: imageUrl,
                    entries,
                    privileges,
                    section: values.section,
                };

                this.submit(
                    this.donateService.updateShopItem$(this.editingItemId()!, request),
                    'admin.shop.updatedSuccess'
                );
            } else {
                const request: ICreateShopItemRequest = {
                    name: values.name.trimEnd(),
                    description: values.description.trimEnd(),
                    price: values.price,
                    code: values.code.trimEnd(),
                    item_type: KIT_ITEM_TYPE,
                    image_url: imageUrl ?? '',
                    has_discount: values.has_discount,
                    discount_percent: values.has_discount ? values.discount_percent : undefined,
                    entries,
                    privileges,
                    section: values.section,
                };

                this.submit(this.donateService.createShopItem$(request), 'admin.shop.createdSuccess');
            }
        } catch (error) {
            this.isLoading.set(false);
            this.requestStatus.showError(this.i18n.translate('admin.shop.uploadError'));
        }
    }

    /**
     * Отправляет запрос сохранения товара и показывает результат.
     *
     * Ошибка разбирается по статусу: 404 означает, что набор с выбранным
     * кодом не захвачен игрой, 400 — что сервер отклонил данные товара.
     *
     * @param request$ Запрос создания или обновления товара.
     * @param successKey Ключ перевода уведомления об успехе.
     */
    private submit(request$: Observable<IShopItem>, successKey: string): void {
        request$
            .pipe(
                catchError((error: unknown) => {
                    // Уникальный индекс по `code` даёт при создании общий 500
                    // вместо 409: причину показываем рядом с полем кода.
                    this.codeTaken.set(this.isCodeTaken(error));
                    this.requestStatus.showError(this.saveErrorText(error));

                    return EMPTY;
                }),
                this.requestStatus.handleSuccess(this.i18n.translate(successKey)),
                finalize(() => this.isLoading.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => {
                this.loadItems();
                this.backToList();
            });
    }

    /**
     * Проверяет, что сохранение товара упало на повторе кода.
     *
     * `donate_shop_items` несёт уникальный индекс по `code`: и `CreateShopItem`,
     * и `UpdateShopItem` отвечают на повтор 409 ALREADY_EXISTS
     * (`shop entry with this code already exists`), включая скрытые записи.
     * Остальные статусы, включая 500, остаются общей ошибкой сервера.
     *
     * @param error Ошибка из HttpClient.
     * @returns true, если сервер ответил 409.
     */
    private isCodeTaken(error: unknown): boolean {
        return error instanceof HttpErrorResponse && error.status === 409;
    }

    /**
     * Возвращает текст уведомления об ошибке сохранения товара.
     *
     * При повторе кода к общему тексту ошибки добавляется причина: одному коду
     * набора соответствует одна запись магазина.
     *
     * @param error Ошибка из HttpClient.
     * @returns Текст уведомления.
     */
    private saveErrorText(error: unknown): string {
        const generic = this.i18n.translate(this.saveErrorKey(error));

        if (this.isCodeTaken(error)) {
            return `${this.i18n.translate('admin.shop.codeTaken')} ${generic}`;
        }

        return generic;
    }

    /**
     * Возвращает ключ перевода ошибки сохранения товара.
     *
     * @param error Ошибка из HttpClient.
     * @returns Ключ перевода для уведомления.
     */
    private saveErrorKey(error: unknown): string {
        const status = error instanceof HttpErrorResponse ? error.status : 0;

        switch (status) {
            case 404:
                return 'admin.shop.codeNotCaptured';
            case 403:
                return 'admin.shop.forbiddenError';
            case 400:
                return 'admin.shop.invalidError';
            default:
                return 'admin.shop.saveError';
        }
    }

    /**
     * Возвращает подпись варианта в списке кодов наборов.
     *
     * Неизвестный код (список не загружен или набор больше не захвачен)
     * выводится как есть, чтобы администратор видел сохранённое значение.
     *
     * @param code Код набора.
     * @returns Строка «название · код · категория» или сам код.
     */
    private kitLabel(code: string): string {
        const kit = this.kitByCode().get(code);

        if (!kit) {
            return code;
        }

        const title = kit.title.trim() || code;

        return `${title} · ${kit.code} · ${this.categoryLabel(kit.category)}`;
    }

    /**
     * Загружает полный список товаров и подписывается на его обновления.
     *
     * Админке нужен именно полный список (`GET /v1/donate/admin/shop/items`):
     * публичный `ListShopItems` возвращает только доступные записи, и скрытый
     * товар нельзя было бы найти, чтобы снова опубликовать.
     */
    private loadItems(): void {
        this.itemsLoading.set(true);
        this.itemsLoadFailed.set(false);
        this.donateService.refreshAdminShopItems$();

        if (this.itemsSubscription && !this.itemsSubscription.closed) {
            return;
        }

        this.itemsSubscription = this.donateService
            .getAdminShopItems$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (items) => {
                    this.shopItems.set(items);
                    this.itemsLoadFailed.set(false);
                    this.itemsLoading.set(false);
                },
                error: () => {
                    this.itemsLoadFailed.set(true);
                    this.itemsLoading.set(false);
                },
            });
    }

    /**
     * Загружает список захваченных наборов для поля кода.
     */
    private loadKits(): void {
        this.kitsLoading.set(true);
        this.kitsLoadFailed.set(false);
        this.kitdefService.refreshKits$();

        if (this.kitsSubscription && !this.kitsSubscription.closed) {
            return;
        }

        this.kitsSubscription = this.kitdefService
            .getKits$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (kits) => {
                    this.kits.set(kits);
                    this.kitsLoadFailed.set(false);
                    this.kitsLoading.set(false);
                },
                error: () => {
                    this.kitsLoadFailed.set(true);
                    this.kitsLoading.set(false);
                },
            });
    }

    /**
     * Возвращает URL изображения товара.
     * Если файл не выбран — пустую строку (для редактирования = оставить текущее).
     */
    private async resolveImageUrl(): Promise<string | undefined> {
        const file = this.form.controls.image.value;

        if (!file) {
            return this.isEditMode() ? '' : undefined;
        }

        return this.mediaService.uploadFile(file, 'UPLOAD_PURPOSE_DONATE_SHOP');
    }

    /**
     * Загружает изображения entries и возвращает готовый массив DTO.
     */
    private async resolveEntries(): Promise<IKitEntryDto[]> {
        const entries = this.entriesArray.getRawValue();
        const result: IKitEntryDto[] = [];

        for (const entry of entries) {
            let imageUrl: string | undefined;

            if (entry.image instanceof File) {
                imageUrl = await this.mediaService.uploadFile(entry.image, 'UPLOAD_PURPOSE_DONATE_SHOP');
            } else if (this.isEditMode() && entry.image_url) {
                imageUrl = entry.image_url;
            }

            result.push({
                game_code: entry.game_code || undefined,
                name: entry.name.trimEnd(),
                description: entry.description?.trimEnd() || undefined,
                quantity: entry.quantity,
                image_url: imageUrl,
            });
        }

        return result;
    }

    /**
     * Возвращает массив возможностей товара для отправки на сервер.
     */
    private resolvePrivileges(): IAbilityItem[] {
        return this.privilegesArray
            .getRawValue()
            .filter((ability) => ability.text.trimEnd())
            .map((ability) => ({
                icon: ability.icon.trimEnd() || '@tui.circle-help',
                text: ability.text.trimEnd(),
            }));
    }

    /**
     * Создаёт FormGroup для одной entry набора.
     *
     * @param entry Существующая entry (при редактировании).
     */
    private createEntryForm(entry?: {
        gameCode?: string;
        name: string;
        description?: string;
        quantity: number;
        imageUrl?: string;
    }): FormGroup<KitEntryForm> {
        const imageControl = new FormControl<File | null>(null);
        const imageUrlControl = new FormControl<string | null>(entry?.imageUrl ?? null);

        const subscription = imageControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((file) => {
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = () => imageUrlControl.setValue(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                imageUrlControl.setValue(null);
            }
        });

        this.entryImageSubscriptions.set(imageControl, subscription);

        return new FormGroup<KitEntryForm>({
            game_code: new FormControl<string>(entry?.gameCode ?? '', { nonNullable: true }),
            name: new FormControl<string>(entry?.name ?? '', {
                nonNullable: true,
                validators: [Validators.required],
            }),
            description: new FormControl<string>(entry?.description ?? '', { nonNullable: true }),
            quantity: new FormControl<number>(entry?.quantity ?? 1, {
                nonNullable: true,
                validators: [Validators.required, Validators.min(1)],
            }),
            image: imageControl,
            image_url: imageUrlControl,
        });
    }

    /**
     * Создаёт FormGroup для одной возможности товара.
     *
     * @param ability Существующая возможность (при редактировании).
     */
    private createAbilityForm(ability?: IAbilityItem): FormGroup<AbilityForm> {
        return new FormGroup<AbilityForm>({
            icon: new FormControl<string>(ability?.icon ?? '', { nonNullable: true }),
            text: new FormControl<string>(ability?.text ?? '', {
                nonNullable: true,
                validators: [Validators.required],
            }),
        });
    }

    /**
     * Сбрасывает форму в начальное состояние.
     */
    private resetForm(): void {
        this.form.reset({
            name: '',
            description: '',
            price: '',
            code: '',
            is_available: true,
            has_discount: false,
            discount_percent: 0,
            section: '',
            image: null,
        });
        this.privilegesArray.clear();
        this.replaceEntries([]);
        this.imagePreviewUrl.set(null);
        this.codeTaken.set(false);
        this.entriesError.set(false);
    }
}

/**
 * Тип формы одной entry набора.
 */
interface KitEntryForm {
    game_code: FormControl<string>;
    name: FormControl<string>;
    description: FormControl<string>;
    quantity: FormControl<number>;
    image: FormControl<File | null>;
    image_url: FormControl<string | null>;
}

/**
 * Тип формы одной возможности товара.
 */
interface AbilityForm {
    icon: FormControl<string>;
    text: FormControl<string>;
}
