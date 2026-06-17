import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    TagKey,
    ActiveTagComponent,
} from '@app/features/admin/moderate-settlement-request/active-tag/active-tag.component';
import { Tag } from '@app/features/admin/moderate-settlement-request/interfaces/tag.interface';
import { RequestStatusService } from '@core/services/request-status.service';
import { SettlementService } from '@entities/settlement';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { I18nService, TranslatePipe } from '@core/i18n';

@Component({
    selector: 'app-set-tags',
    imports: [ActiveTagComponent, TranslatePipe],
    templateUrl: './set-tags.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
})
export class SetTagsComponent implements OnInit {
    /**
     * Контекст открытого диалогового окна.
     */
    protected readonly context: TuiDialogContext<
        void,
        { settlementId: string; settlementName: string; tagsIds: { id: string }[] }
    > =
        inject<TuiDialogContext<void, { settlementId: string; settlementName: string; tagsIds: { id: string }[] }>>(
            POLYMORPHEUS_CONTEXT
        );

    protected tags: Tag[] = [
        {
            id: '6936e810061b4fa4e3467319',
            text: 'settlements.tags.east',
            action: 'add' as 'add' | 'remove' | 'custom',
            type: 'east' as TagKey,
            unique: true,
            disabled: false,
        },
        {
            id: '6936e848061b4fa4e346731a',
            text: 'settlements.tags.west',
            action: 'add' as 'add' | 'remove' | 'custom',
            type: 'west' as TagKey,
            unique: true,
            disabled: false,
        },
        {
            id: '6936e858061b4fa4e346731b',
            text: 'settlements.tags.suzerain',
            action: 'add' as 'add' | 'remove' | 'custom',
            type: 'suzerain' as TagKey,
            disabled: false,
        },
    ];

    protected addedTags: Tag[] = [];

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    isLoading = false;

    ngOnInit() {
        this.context.data.tagsIds.forEach((item) => {
            debugger;
            const tag = this.getTag(item.id);

            if (tag) {
                tag.action = 'remove';
                tag.disabled = true;
                this.addedTags.push(tag);

                this.tags = this.tags.filter((item) => item.id !== tag.id);

                const hasUniqueTag = this.addedTags.some((addedTag) => addedTag.unique);

                if (hasUniqueTag) {
                    this.tags.forEach((item) => {
                        if (item.unique) {
                            item.disabled = true;
                        }
                    });
                }
            }
        });
    }

    addTag(type: any, tag: any) {
        if (type === 'add') {
            this.tags = this.tags.filter((item) => item !== tag);

            tag.action = 'remove';
            this.addedTags.push(tag);

            const hasUniqueTag = this.addedTags.some((addedTag) => addedTag.unique);

            if (hasUniqueTag) {
                this.tags.forEach((item) => {
                    if (item.unique) {
                        item.disabled = true;
                    }
                });
            }
        }
    }

    removeTag(type: any, tag: any) {
        if (type === 'remove') {
            this.addedTags = this.addedTags.filter((item) => item !== tag);

            tag.action = 'add';
            this.tags.push(tag);

            const hasUniqueTag = this.addedTags.some((addedTag) => addedTag.unique);
            if (!hasUniqueTag) {
                this.tags.forEach((item) => {
                    if (item.unique) {
                        item.disabled = false;
                    }
                });
            }
        }
    }

    /**
     * Подтверждает одобрение анкеты.
     */
    protected saveTags(): void {
        if (this.addedTags.length === 0) {
            console.warn('Нет тегов для сохранения');
            return;
        }

        this.isLoading = true;

        // Предполагаем, что settlementId есть в данных контекста
        const settlementId = this.context.data.settlementId;
        // Создаем массив запросов для каждого тега
        const tagRequests = this.addedTags.map((tag) =>
            this.settlementService.postSettlementTags(tag.id, settlementId).pipe(
                catchError((error) => {
                    console.error(`Ошибка при сохранении тега "${tag.text}":`, error);
                    // Возвращаем объект с информацией об ошибке
                    return of({
                        success: false,
                        tag: tag.text,
                        error: error.message,
                    });
                }),
                // При успехе возвращаем объект с информацией
                map(() => ({
                    success: true,
                    tag: tag.text,
                }))
            )
        );

        // Отправляем все теги параллельно
        forkJoin(tagRequests)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                finalize(() => (this.isLoading = false))
            )
            .subscribe({
                next: (results) => {
                    // Анализируем результаты
                    const successful = results.filter((r) => r.success);
                    const failed = results.filter((r) => !r.success);

                    if (successful.length > 0) {
                        this.requestStatusService.handleSuccess(
                            this.i18n.translate('settlements.tags.saved', { count: successful.length }),
                            this.context.$implicit
                        );
                    }

                    if (failed.length > 0) {
                        console.warn(`Не удалось сохранить ${failed.length} тегов`);
                        // Можно показать отдельное предупреждение
                    }

                    console.log('Результаты сохранения тегов:', results);
                },
                error: (error) => {
                    this.requestStatusService.handleError()(error);
                },
            });
    }

    protected getTag(tagId: string) {
        return this.settlementService.getTagById(tagId);
    }
}
