import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RequestStatusService } from '@core/services/request-status.service';
import {
    DonateService,
    ICreateShopItemRequest,
    IKitEntryDto,
    IShopItem,
    IUpdateShopItemRequest,
    ShopItemType,
} from '@entities/donate';
import { MediaService } from '@entities/media';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { TuiIcon, TuiLoader } from '@taiga-ui/core';
import { MarketGridSkeletonComponent } from '@shared/ui/skeletons';
import { TuiFile, TuiFiles, TuiFilesComponent } from '@taiga-ui/kit';
import { finalize, map, Observable, startWith, Subject, Subscription, switchMap, tap, timer } from 'rxjs';

/**
 * Панель управления донат-магазином в админке.
 *
 * Позволяет просматривать список товаров, создавать новые,
 * редактировать и удалять существующие.
 */
@Component({
    selector: 'app-donate-shop-panel',
    standalone: true,
    imports: [ReactiveFormsModule, FormsModule, AsyncPipe, LHInputComponent, TuiIcon, TuiLoader, TuiFiles, TuiFilesComponent, TuiFile, MarketGridSkeletonComponent],
    templateUrl: './donate-shop-panel.component.html',
    styleUrl: './donate-shop-panel.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonateShopPanelComponent {
    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис загрузки медиафайлов.
     */
    private readonly mediaService = inject(MediaService);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Триггер обновления списка товаров.
     */
    private readonly refresh$ = new Subject<void>();

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
     * Признак выполнения запроса.
     */
    protected isLoading = signal(false);

    /**
     * URL превью выбранного изображения товара.
     */
    protected imagePreviewUrl = signal<string | null>(null);

    /**
     * Подписки на изменения файлов entry набора.
     */
    private readonly entryImageSubscriptions = new Map<FormControl<File | null>, Subscription>();

    /**
     * Доступные типы товара.
     */
    /**
     * Внутренний тип товара с псевдо-типом "Привилегия".
     * На бэкенд отправляется как ITEM_TYPE_ITEM, но с поддержкой entries.
     */
    protected readonly itemTypes: (ShopItemType | 'ITEM_TYPE_PRIVILEGE')[] = [
        'ITEM_TYPE_ITEM',
        'ITEM_TYPE_KIT',
        'ITEM_TYPE_PRIVILEGE',
    ];

    /**
     * Возвращает отображаемое название типа товара.
     *
     * @param type Тип товара.
     * @returns Локализованная строка.
     */
    protected itemTypeDisplay = (type: ShopItemType | 'ITEM_TYPE_PRIVILEGE'): string =>
        this.getItemTypeLabel(type);

    /**
     * Возвращает локализованное название типа товара.
     *
     * @param type Тип товара.
     * @returns Локализованная строка.
     */
    protected getItemTypeLabel(type: string): string {
        return this.itemTypeLabels[type as ShopItemType | 'ITEM_TYPE_PRIVILEGE'] ?? 'Не указан';
    }

    /**
     * Отображаемое название типа товара.
     */
    protected readonly itemTypeLabels: Record<ShopItemType | 'ITEM_TYPE_PRIVILEGE', string> = {
        ITEM_TYPE_ITEM: 'Предмет',
        ITEM_TYPE_KIT: 'Набор',
        ITEM_TYPE_UNSPECIFIED: 'Не указан',
        ITEM_TYPE_PRIVILEGE: 'Привилегия',
    };

    /**
     * Форма создания/редактирования товара.
     */
    protected readonly form = new FormGroup({
        name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        description: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        price: new FormControl<string>('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/^\d+\.?\d*$/)],
        }),
        code: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        item_type: new FormControl<ShopItemType | 'ITEM_TYPE_PRIVILEGE'>('ITEM_TYPE_ITEM', {
            nonNullable: true,
            validators: [Validators.required],
        }),
        is_available: new FormControl<boolean>(true, { nonNullable: true }),
        has_discount: new FormControl<boolean>(false, { nonNullable: true }),
        discount_percent: new FormControl<number>(0, { nonNullable: true }),
        image: new FormControl<File | null>(null),
        entries: new FormArray<FormGroup<KitEntryForm>>([]),
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
        const imageUrl = this.imagePreviewUrl() ?? '';

        return {
            name: values.name || 'Название товара',
            description: values.description || 'Описание товара',
            price: values.price || '0',
            code: values.code || '',
            itemType: values.item_type ?? 'ITEM_TYPE_ITEM',
            isAvailable: values.is_available ?? true,
            hasDiscount: values.has_discount ?? false,
            discountPercent: values.discount_percent ?? 0,
            imageUrl,
            entries:
                values.item_type === 'ITEM_TYPE_KIT' || values.item_type === 'ITEM_TYPE_PRIVILEGE'
                    ? entries.map((entry, index) => ({
                          name: entry.name || `Позиция ${index + 1}`,
                          description: entry.description,
                          quantity: entry.quantity,
                          imageUrl: entry.image_url ?? '',
                      }))
                    : [],
        };
    });

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
     * Список товаров магазина.
     */
    protected readonly shopItems$: Observable<IShopItem[]> = this.refresh$.pipe(
        startWith(null),
        switchMap(() => this.donateService.getShopItems$()),
        tap(() => this.isLoading.set(false))
    );

    /**
     * Возвращает FormArray entries.
     */
    protected get entriesArray(): FormArray<FormGroup<KitEntryForm>> {
        return this.form.controls.entries;
    }

    /**
     * Конструктор. Подписывается на изменение типа товара
     * и сбрасывает entries при переключении на ITEM_TYPE_ITEM.
     */
    public constructor() {
        this.form.controls.item_type.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((type) => {
            if (type !== 'ITEM_TYPE_KIT' && type !== 'ITEM_TYPE_PRIVILEGE') {
                this.entriesArray.clear();
                this.entryImageSubscriptions.forEach((sub) => sub.unsubscribe());
                this.entryImageSubscriptions.clear();
            }
        });

        this.form.controls.image.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((file) => {
            if (file instanceof File) {
                const reader = new FileReader();
                reader.onload = () => this.imagePreviewUrl.set(reader.result as string);
                reader.readAsDataURL(file);
            } else {
                this.imagePreviewUrl.set(null);
            }
        });
    }

    /**
     * Переключается на вкладку создания товара.
     */
    protected startCreate(): void {
        this.isEditMode.set(false);
        this.editingItemId.set(null);
        this.resetForm();
        this.activeTabIndex.set(1);
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

        const isPrivilege =
            item.itemType === 'ITEM_TYPE_ITEM' && item.entries && item.entries.length > 0;

        this.form.patchValue({
            name: item.name,
            description: item.description,
            price: item.price,
            code: item.code,
            item_type: isPrivilege ? 'ITEM_TYPE_PRIVILEGE' : item.itemType,
            is_available: item.isAvailable,
            has_discount: item.hasDiscount ?? false,
            discount_percent: item.discountPercent ?? 0,
        });

        this.entriesArray.clear();
        this.entryImageSubscriptions.forEach((sub) => sub.unsubscribe());
        this.entryImageSubscriptions.clear();

        item.entries?.forEach((entry) => {
            this.entriesArray.push(this.createEntryForm(entry));
        });

        this.activeTabIndex.set(1);
    }

    /**
     * Возвращает на вкладку списка.
     */
    protected backToList(): void {
        this.activeTabIndex.set(0);
        this.resetForm();
    }

    /**
     * Добавляет пустую позицию в набор.
     */
    protected addEntry(): void {
        this.entriesArray.push(this.createEntryForm());
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
     * @param item Товар для удаления.
     */
    protected deleteItem(item: IShopItem): void {
        if (!confirm(`Удалить товар "${item.name}"?`)) {
            return;
        }

        this.donateService
            .deleteShopItem$(item.id)
            .pipe(
                this.requestStatus.handleError(),
                this.requestStatus.handleSuccess('Товар удалён'),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.refresh$.next());
    }

    /**
     * Сохраняет товар (создание или обновление).
     */
    protected async saveItem(): Promise<void> {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.isLoading.set(true);

        try {
            const values = this.form.getRawValue();
            const imageUrl = await this.resolveImageUrl();
            const entries = await this.resolveEntries();
            const itemType = values.item_type === 'ITEM_TYPE_PRIVILEGE' ? 'ITEM_TYPE_ITEM' : values.item_type;
            const shouldSendEntries =
                values.item_type === 'ITEM_TYPE_KIT' || values.item_type === 'ITEM_TYPE_PRIVILEGE';

            if (this.isEditMode() && this.editingItemId()) {
                const request: IUpdateShopItemRequest = {
                    id: this.editingItemId()!,
                    name: values.name,
                    description: values.description,
                    price: values.price,
                    code: values.code,
                    item_type: itemType,
                    is_available: values.is_available,
                    has_discount: values.has_discount,
                    discount_percent: values.has_discount ? values.discount_percent : undefined,
                    image_url: imageUrl,
                    entries: shouldSendEntries ? entries : undefined,
                };

                this.donateService
                    .updateShopItem$(this.editingItemId()!, request)
                    .pipe(
                        this.requestStatus.handleError(),
                        this.requestStatus.handleSuccess('Товар обновлён'),
                        finalize(() => this.isLoading.set(false)),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe(() => {
                        this.refresh$.next();
                        this.backToList();
                    });
            } else {
                const request: ICreateShopItemRequest = {
                    name: values.name,
                    description: values.description,
                    price: values.price,
                    code: values.code,
                    item_type: itemType,
                    image_url: imageUrl ?? '',
                    has_discount: values.has_discount,
                    discount_percent: values.has_discount ? values.discount_percent : undefined,
                    entries: shouldSendEntries ? entries : undefined,
                };

                this.donateService
                    .createShopItem$(request)
                    .pipe(
                        this.requestStatus.handleError(),
                        this.requestStatus.handleSuccess('Товар создан'),
                        finalize(() => this.isLoading.set(false)),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe(() => {
                        this.refresh$.next();
                        this.backToList();
                    });
            }
        } catch (error) {
            this.isLoading.set(false);
            this.requestStatus.showError('Ошибка загрузки изображения');
        }
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
                name: entry.name,
                description: entry.description || undefined,
                quantity: entry.quantity,
                image_url: imageUrl,
            });
        }

        return result;
    }

    /**
     * Создаёт FormGroup для одной entry набора.
     *
     * @param entry Существующая entry (при редактировании).
     */
    private createEntryForm(entry?: {
        name: string;
        description?: string;
        quantity: number;
        imageUrl?: string;
    }): FormGroup<KitEntryForm> {
        const imageControl = new FormControl<File | null>(null);
        const imageUrlControl = new FormControl<string | null>(entry?.imageUrl ?? null);

        const subscription = imageControl.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((file) => {
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
     * Сбрасывает форму в начальное состояние.
     */
    private resetForm(): void {
        this.form.reset({
            name: '',
            description: '',
            price: '',
            code: '',
            item_type: 'ITEM_TYPE_ITEM',
            is_available: true,
            has_discount: false,
            discount_percent: 0,
            image: null,
        });
        this.entriesArray.clear();
        this.entryImageSubscriptions.forEach((sub) => sub.unsubscribe());
        this.entryImageSubscriptions.clear();
        this.imagePreviewUrl.set(null);
    }
}

/**
 * Тип формы одной entry набора.
 */
interface KitEntryForm {
    name: FormControl<string>;
    description: FormControl<string>;
    quantity: FormControl<number>;
    image: FormControl<File | null>;
    image_url: FormControl<string | null>;
}
