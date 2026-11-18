import { Signal } from '@angular/core';

/**
 * ПРОТОТИП, НЕ ПРОДАКШН. Типы и контракт управления списком наделов
 * для вариантов сортировки. Удалить вместе с папкой sort-prototype.
 */

/**
 * Поле сортировки списка наделов.
 */
export type ProtoSortField = 'default' | 'population' | 'online' | 'diplomacy';

/**
 * Направление сортировки.
 */
export type ProtoSortDirection = 'asc' | 'desc';

/**
 * Состояние сортировки списка наделов.
 */
export interface ProtoSortState {
    field: ProtoSortField;
    direction: ProtoSortDirection;
}

/**
 * Вариант фильтра с количеством наделов.
 */
export interface ProtoFilterOption {
    value: string;
    count: number;
}

/**
 * Активный фильтр в виде удаляемого токена.
 */
export interface ProtoFilterToken {
    kind: 'type' | 'course';
    value: string;
}

/**
 * Управление списком наделов, которое страница передаёт вариантам
 * прототипа: вариант читает состояние и зовёт методы, не зная о странице.
 */
export interface ProtoControls {
    readonly sortState: Signal<ProtoSortState>;
    readonly sortKeys: readonly ProtoSortField[];
    readonly query: Signal<string>;
    readonly loading: Signal<boolean>;
    readonly typeOptions: Signal<ProtoFilterOption[]>;
    readonly courseOptions: Signal<ProtoFilterOption[]>;
    readonly typeFilter: Signal<string | null>;
    readonly courseFilter: Signal<string | null>;
    readonly foundCount: Signal<number>;

    /**
     * Устанавливает поле сортировки; повторный вызов меняет направление.
     *
     * @param field Поле сортировки.
     */
    setSort(field: ProtoSortField): void;

    /**
     * Меняет направление сортировки текущего поля.
     */
    flipSort(): void;

    /**
     * Меняет поисковую строку.
     *
     * @param query Строка поиска.
     */
    setQuery(query: string): void;

    /**
     * Включает или снимает фильтр по типу.
     *
     * @param value Подпись типа.
     */
    toggleType(value: string): void;

    /**
     * Включает или снимает фильтр по курсу.
     *
     * @param value Курс.
     */
    toggleCourse(value: string): void;

    /**
     * Сбрасывает поиск и фильтры.
     */
    resetFilters(): void;
}
