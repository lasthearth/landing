import { Directive, inject, OnInit, OnDestroy, computed, Signal, WritableSignal, signal } from '@angular/core';
import { LocalStorageService } from '@core/services/local-storage.service';
import { SectionStateService } from '../services/section-state.service';
import { GlobalExpandService } from '../services/global-expand.service';

/**
 * Абстрактный базовый класс для раскрывающихся секций правил.
 * Содержит общую бизнес-логику для управления состоянием.
 */
@Directive()
export abstract class BaseExpandableSection implements OnInit, OnDestroy {
    /**
     * Сервис для работы с localStorage.
     */
    protected readonly localStorageService = inject(LocalStorageService);

    /**
     * Сервис управления состоянием секций.
     */
    protected readonly sectionStateService = inject(SectionStateService);

    /**
     * Сервис глобального управления раскрытием всех секций.
     */
    protected readonly globalExpandService = inject(GlobalExpandService);

    /**
     * Уникальный идентификатор секции.
     * Должен быть определен в наследниках через input().
     */
    public abstract sectionId: Signal<string>;

    /**
     * Заголовок секции.
     * Должен быть определен в наследниках через input().
     */
    public abstract title: Signal<string>;

    /**
     * Иконка из Taiga UI.
     * Должен быть определен в наследниках через input().
     */
    public abstract icon: Signal<string | undefined>;

    /**
     * ID родительской секции (для иерархии).
     * Должен быть определен в наследниках через input() при необходимости.
     */
    public abstract parentId: Signal<string | undefined>;

    /**
     * Уровень вложенности секции.
     * Должен быть определен в наследниках через input().
     */
    public abstract level: Signal<number>;

    /**
     * Вычисляет реальное состояние открытости секции.
     * Состояние берется из SectionStateService.
     */
    protected readonly isExpanded: Signal<boolean> = computed(() => {
        return this.sectionStateService.isSectionOpen(this.sectionId());
    });

    /**
     * Признак того, была ли секция просмотрена.
     */
    protected wasWatched: WritableSignal<boolean> = signal(false);

    /**
     * Вычисляет состояние просмотренности секции.
     * Для level 0 секций проверяет все подсекции.
     * Для остальных использует локальное состояние.
     */
    protected readonly isWatched: Signal<boolean> = computed(() => {
        // Если это level 0 секция - проверяем все подсекции
        if (this.level() === 0) {
            return this.sectionStateService.areAllSubsectionsWatched(this.sectionId());
        }
        // Иначе используем локальное состояние
        return this.wasWatched();
    });

    /**
     * @inheritdoc.
     */
    public ngOnInit(): void {
        this.loadWatchedState();

        // Регистрируем секцию в сервисах
        this.sectionStateService.registerSection(this.sectionId(), this.parentId());
        this.globalExpandService.registerSection(this.sectionId(), this.parentId());

        // Восстанавливаем состояние просмотренных подсекций после перезагрузки
        if (this.wasWatched() && this.parentId()) {
            this.sectionStateService.markSubsectionWatched(this.parentId()!, this.sectionId());
        }
    }

    /**
     * @inheritdoc.
     */
    public ngOnDestroy(): void {
        // Ничего не нужно делать - секции управляются через SectionStateService
    }

    /**
     * Переключает состояние открытости секции.
     * Сбрасывает глобальное состояние, если локальное изменение противоречит ему.
     */
    protected toggle(): void {
        const currentState = this.sectionStateService.isSectionOpen(this.sectionId());
        const newState = !currentState;
        this.sectionStateService.updateSectionState(this.sectionId(), newState);

        // Если секция открылась/закрылась и это отличается от глобального состояния - сбрасываем глобальное состояние
        const globalState = this.globalExpandService.globalExpandState();
        if (globalState !== undefined && newState !== globalState) {
            this.globalExpandService.set(undefined);
        }

        if (newState && !this.wasWatched()) {
            this.markAsWatched();
            // Если это подсекция - регистрируем просмотр для родителя
            const parentId = this.parentId();
            if (parentId) {
                this.sectionStateService.markSubsectionWatched(parentId, this.sectionId());
            }
        }
    }

    /**
     * Помечает секцию как просмотренную.
     */
    protected markAsWatched(): void {
        this.wasWatched.set(true);
        const storageKey = `${this.sectionId()}WasWatched`;
        this.localStorageService.setItem(storageKey, true);
    }

    /**
     * Загружает состояние просмотренности из localStorage.
     */
    private loadWatchedState(): void {
        const storageKey = `${this.sectionId()}WasWatched`;
        this.wasWatched.set(this.localStorageService.hasKey(storageKey));
    }
}
