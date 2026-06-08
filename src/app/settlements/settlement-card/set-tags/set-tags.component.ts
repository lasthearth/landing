import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    TagKey,
    ActiveTagComponent,
} from '@app/profile/admin/moderate-settlement-request/active-tag/active-tag.component';
import { Tag } from '@app/profile/admin/moderate-settlement-request/interfaces/tag.interface';
import { RequestStatusService } from '@app/services/request-status.service';
import { SettlementService } from '@app/services/settlement.service';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';

@Component({
    selector: 'app-set-tags',
    imports: [ActiveTagComponent],
    templateUrl: './set-tags.component.html',
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
            text: 'Восток',
            action: 'add' as 'add' | 'remove' | 'custom',
            type: 'east' as TagKey,
            unique: true,
            disabled: false,
        },
        {
            id: '6936e848061b4fa4e346731a',
            text: 'Запад',
            action: 'add' as 'add' | 'remove' | 'custom',
            type: 'west' as TagKey,
            unique: true,
            disabled: false,
        },
        {
            id: '6936e858061b4fa4e346731b',
            text: 'Сюзерен',
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
                            `Успешно сохранено ${successful.length} тегов`,
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
