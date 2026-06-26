import { Injectable, inject, signal } from '@angular/core';

import { Observable, map, tap } from 'rxjs';
import { hexToColor } from '../lib/hex-to-color.function';
import { ISettlementTag } from './i-settlement-tag';
import { IColor } from './i-color';
import { SettlementTagService } from '../api/settlement-tag.service';

/**
 * Хранилище глобальных тегов поселений.
 *
 * Загружает теги один раз и кэширует их для всех потребителей.
 */
@Injectable({
    providedIn: 'root',
})
export class SettlementTagStore {
    /**
     * Список загруженных тегов.
     */
    public readonly tags = signal<ISettlementTag[]>([]);

    /**
     * Признак завершения первичной загрузки.
     */
    public readonly loaded = signal<boolean>(false);

    /**
     * Признак загрузки.
     */
    public readonly loading = signal<boolean>(false);

    /**
     * Сервис тегов поселений.
     */
    private readonly tagService: SettlementTagService = inject(SettlementTagService);

    /**
     * Идентификаторы системных тегов.
     */
    public readonly specialTagIds = {
        east: '6936e810061b4fa4e3467319',
        west: '6936e848061b4fa4e346731a',
        suzerain: '6936e858061b4fa4e346731b',
    } as const;

    /**
     * Корректные цвета системных тегов (бэкенд возвращает некорректные/белые значения).
     */
    private readonly specialTagColors: Record<string, IColor> = {
        [this.specialTagIds.east]: hexToColor('#ff6b6b'),
        [this.specialTagIds.west]: hexToColor('#2cb5b6'),
        [this.specialTagIds.suzerain]: hexToColor('#9d5bd2'),
    };

    /**
     * Загружает список тегов, если он ещё не загружен.
     *
     * @returns Observable с массивом тегов.
     */
    public loadTags$(): Observable<ISettlementTag[]> {
        if (this.loaded()) {
            return new Observable<ISettlementTag[]>((subscriber) => {
                subscriber.next(this.tags());
                subscriber.complete();
            });
        }

        this.loading.set(true);

        return this.tagService.getTags$().pipe(
            map((tags) => tags.map((tag) => this.patchSpecialTagColor(tag))),
            tap({
                next: (tags) => {
                    this.tags.set(tags);
                    this.loaded.set(true);
                    this.loading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                },
            })
        );
    }

    /**
     * Подменяет цвет системных тегов на корректные из проекта.
     *
     * @param tag Исходный тег.
     * @returns Тег с исправленным цветом.
     */
    private patchSpecialTagColor(tag: ISettlementTag): ISettlementTag {
        const color = this.specialTagColors[tag.id];

        return color ? { ...tag, color } : tag;
    }

    /**
     * Добавляет тег в локальный кэш.
     *
     * @param tag Новый тег.
     */
    public addTag(tag: ISettlementTag): void {
        this.tags.update((list) => [...list, tag]);
    }

    /**
     * Удаляет тег из локального кэша.
     *
     * @param tagId Идентификатор тега.
     */
    public removeTag(tagId: string): void {
        this.tags.update((list) => list.filter((item) => item.id !== tagId));
    }

    /**
     * Возвращает тег по идентификатору.
     *
     * @param tagId Идентификатор тега.
     * @returns Найденный тег или undefined.
     */
    public getTagById(tagId: string): ISettlementTag | undefined {
        return this.tags().find((tag) => tag.id === tagId);
    }

    /**
     * Возвращает признак наличия системного тега у поселения.
     *
     * @param settlementTags Список ссылок на теги поселения.
     * @param type Тип системного тега.
     * @returns true, если тег присутствует.
     */
    public hasSpecialTag(
        settlementTags: { id: string }[],
        type: keyof typeof this.specialTagIds
    ): boolean {
        const specialId = this.specialTagIds[type];

        return settlementTags.some((tag) => tag.id === specialId);
    }
}
