import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { SettlementService } from '@entities/settlement';
import { hexToColor, ISettlementTag, SettlementTagService, SettlementTagStore } from '@entities/settlement-tag';
import { ActiveTagComponent } from '@app/features/admin/moderate-settlement-request/active-tag/active-tag.component';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { ConfirmDialogService } from '@shared/ui/confirm-dialog';
import { catchError, EMPTY, finalize, forkJoin, map, of } from 'rxjs';

/**
 * Данные, передаваемые в диалог управления тегами поселения.
 */
interface SetTagsDialogData {
    /**
     * Идентификатор поселения.
     */
    settlementId: string;

    /**
     * Название поселения.
     */
    settlementName: string;

    /**
     * Идентификаторы уже назначенных тегов.
     */
    tagsIds: { id: string }[];
}

/**
 * Результат закрытия диалога.
 */
interface SetTagsDialogResult {
    /**
     * Актуальный список идентификаторов тегов поселения.
     */
    tags: { id: string }[];
}

/**
 * Компонент диалога управления тегами поселения.
 *
 * Позволяет добавлять/удалять существующие теги,
 * создавать новые теги и удалять глобальные теги.
 */
@Component({
    selector: 'app-set-tags',
    standalone: true,
    imports: [ActiveTagComponent, TranslatePipe, ReactiveFormsModule, TuiIcon, LHInputComponent],
    templateUrl: './set-tags.component.html',
    styles: [':host { display: block; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetTagsComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<SetTagsDialogResult, SetTagsDialogData> =
        inject<TuiDialogContext<SetTagsDialogResult, SetTagsDialogData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис глобальных тегов.
     */
    private readonly tagService: SettlementTagService = inject(SettlementTagService);

    /**
     * Хранилище тегов.
     */
    protected readonly tagStore: SettlementTagStore = inject(SettlementTagStore);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис диалогов подтверждения.
     */
    private readonly confirmDialog: ConfirmDialogService = inject(ConfirmDialogService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Набор идентификаторов назначенных тегов.
     */
    protected readonly assignedIds = signal<Set<string>>(
        new Set(this.context.data.tagsIds.map((item) => item.id))
    );

    /**
     * Исходный набор идентификаторов для вычисления diff при сохранении.
     */
    private readonly originalAssignedIds = new Set(this.assignedIds());

    /**
     * Признак сохранения изменений.
     */
    protected readonly isSaving = signal<boolean>(false);

    /**
     * Признак создания нового тега.
     */
    protected readonly isCreating = signal<boolean>(false);

    /**
     * Палитра пастельных цветов для новых тегов.
     */
    protected readonly tagColorPalette: string[] = [
        '#ff6b6b',
        '#ff7920',
        '#f59e0b',
        '#16a34a',
        '#2cb5b6',
        '#3d5381',
        '#9d5bd2',
        '#86523b',
        '#720000',
        '#6b7280',
    ];

    /**
     * Форма создания нового тега.
     */
    protected readonly newTagForm = new FormGroup({
        name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
        color: new FormControl<string>(this.tagColorPalette[0], {
            nonNullable: true,
            validators: [Validators.required],
        }),
        description: new FormControl<string>('', { nonNullable: true }),
    });

    /**
     * Список назначенных тегов.
     */
    protected readonly assignedTags = computed(() =>
        this.tagStore.tags().filter((tag) => this.assignedIds().has(tag.id))
    );

    /**
     * Список доступных для добавления тегов.
     */
    protected readonly availableTags = computed(() =>
        this.tagStore.tags().filter((tag) => !this.assignedIds().has(tag.id))
    );

    /**
     * Признак наличия несохранённых изменений.
     */
    protected readonly hasChanges = computed(() => {
        const current = this.assignedIds();

        if (current.size !== this.originalAssignedIds.size) {
            return true;
        }

        for (const id of current) {
            if (!this.originalAssignedIds.has(id)) {
                return true;
            }
        }

        return false;
    });

    /**
     * Загружает список тегов при инициализации.
     */
    constructor() {
        this.tagStore.loadTags$().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Добавляет тег к поселению.
     *
     * @param tag Тег для добавления.
     */
    protected assignTag(tag: ISettlementTag): void {
        this.assignedIds.update((set) => new Set(set).add(tag.id));
    }

    /**
     * Убирает тег из поселения.
     *
     * @param tag Тег для удаления.
     */
    protected unassignTag(tag: ISettlementTag): void {
        this.assignedIds.update((set) => {
            const next = new Set(set);
            next.delete(tag.id);

            return next;
        });
    }

    /**
     * Выбирает цвет для нового тега из палитры.
     *
     * @param color HEX-код цвета.
     */
    protected selectColor(color: string): void {
        this.newTagForm.controls.color.setValue(color);
    }

    /**
     * Создаёт новый глобальный тег и сразу назначает его поселению.
     */
    protected createTag(): void {
        if (this.newTagForm.invalid) {
            this.newTagForm.markAllAsTouched();
            return;
        }

        const { name, color, description } = this.newTagForm.getRawValue();

        this.isCreating.set(true);

        this.tagService
            .createTag$( {
                name: name.trim(),
                color: hexToColor(color),
                description: description.trim() || undefined,
            })
            .pipe(
                catchError((error) => {
                    this.requestStatusService.showError(this.i18n.translate('settlements.tags.createError'));
                    return EMPTY;
                }),
                finalize(() => this.isCreating.set(false))
            )
            .subscribe((tag) => {
                this.tagStore.addTag(tag);
                this.assignTag(tag);
                this.newTagForm.reset({ name: '', color: this.tagColorPalette[0], description: '' });
                this.requestStatusService.handleSuccess(
                    this.i18n.translate('settlements.tags.createdSuccess', { name: tag.name })
                );
            });
    }

    /**
     * Удаляет глобальный тег после подтверждения.
     *
     * @param tag Тег для удаления.
     */
    protected deleteTag(tag: ISettlementTag): void {
        this.confirmDialog
            .open({
                title: this.i18n.translate('settlements.tags.deleteTitle'),
                text: this.i18n.translate('settlements.tags.deleteText', { name: tag.name }),
            })
            .subscribe((confirmed) => {
                if (!confirmed) {
                    return;
                }

                this.tagService
                    .deleteTag$(tag.id)
                    .pipe(
                        this.requestStatusService.handleError(
                            this.i18n.translate('settlements.tags.deleteError')
                        )
                    )
                    .subscribe(() => {
                        this.tagStore.removeTag(tag.id);
                        this.assignedIds.update((set) => {
                            const next = new Set(set);
                            next.delete(tag.id);

                            return next;
                        });
                        this.requestStatusService.handleSuccess(
                            this.i18n.translate('settlements.tags.deletedSuccess', { name: tag.name })
                        );
                    });
            });
    }

    /**
     * Сохраняет изменения: добавляет и удаляет теги поселения.
     */
    protected saveTags(): void {
        const current = this.assignedIds();
        const addedIds: string[] = [];
        const removedIds: string[] = [];

        for (const id of current) {
            if (!this.originalAssignedIds.has(id)) {
                addedIds.push(id);
            }
        }

        for (const id of this.originalAssignedIds) {
            if (!current.has(id)) {
                removedIds.push(id);
            }
        }

        if (addedIds.length === 0 && removedIds.length === 0) {
            this.context.$implicit.complete();
            return;
        }

        this.isSaving.set(true);

        const settlementId = this.context.data.settlementId;
        const addRequests = addedIds.map((tagId) =>
            this.settlementService.postSettlementTags(tagId, settlementId).pipe(
                map(() => ({ success: true, tagId })),
                catchError((error) => of({ success: false, tagId, error }))
            )
        );
        const removeRequests = removedIds.map((tagId) =>
            this.settlementService.removeTagFromSettlement$(tagId, settlementId).pipe(
                map(() => ({ success: true, tagId })),
                catchError((error) => of({ success: false, tagId, error }))
            )
        );

        forkJoin([...addRequests, ...removeRequests])
            .pipe(
                finalize(() => this.isSaving.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((results) => {
                const failed = results.filter((r) => !r.success);

                if (failed.length > 0) {
                    this.requestStatusService.showError(
                        this.i18n.translate('settlements.tags.saveError', { count: failed.length })
                    );

                    return;
                }

                this.requestStatusService.handleSuccess(
                    this.i18n.translate('settlements.tags.saved', { count: results.length })
                );

                this.context.completeWith({
                    tags: Array.from(current).map((id) => ({ id })),
                });
            });
    }

}
