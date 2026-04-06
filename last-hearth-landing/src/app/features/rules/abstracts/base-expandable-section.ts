import { Directive, inject, OnInit, OnDestroy, signal, computed, Signal, WritableSignal, effect, untracked } from '@angular/core';
import { LocalStorageService } from '@app/services/local-storage.service';
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
     * Локальное состояние открытости секции.
     */
    protected isOpen: WritableSignal<boolean> = signal(false);

    /**
     * Признак того, была ли секция просмотрена.
     */
    protected wasWatched: WritableSignal<boolean> = signal(false);

    /**
     * Флаг инициализации секции.
     * Нужен чтобы не перезаписывать состояние в ngOnInit если уже есть глобальное управление.
     */
    private isInitialized = false;

    /**
     * Effect для синхронизации локального состояния с глобальным.
     * Когда глобальное состояние активно — синхронизируем локальное.
     */
    private readonly syncWithGlobal = effect(() => {
        if (!this.isInitialized) return;

        const globalState = this.globalExpandService.globalExpandState();

        if (globalState !== undefined) {
            this.isOpen.set(globalState);
        } else {
            // Синхронизируем с состоянием из сервиса
            const serviceState = this.sectionStateService.isSectionOpen(this.sectionId());
            if (serviceState !== this.isOpen()) {
                untracked(() => this.isOpen.set(serviceState));
            }
        }
    });

    /**
     * Вычисляет реальное состояние открытости.
     * Приоритет: глобальное состояние > локальное isOpen
     */
    protected readonly isExpanded: Signal<boolean> = computed(() => {
        const globalForce = this.globalExpandService.globalExpandState();

        // Если есть глобальное состояние - используем его
        if (globalForce !== undefined) {
            return globalForce;
        }

        // Иначе используем локальное состояние
        return this.isOpen();
    });

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

        // Регистрируем секцию в сервисе
        this.sectionStateService.registerSection(this.sectionId(), this.parentId());

        // Восстанавливаем состояние просмотренных подсекций после перезагрузки
        if (this.wasWatched() && this.parentId()) {
            this.sectionStateService.markSubsectionWatched(this.parentId()!, this.sectionId());
        }

        // Загружаем состояние из сервиса только если нет глобального управления
        const globalState = this.globalExpandService.globalExpandState();
        if (globalState === undefined) {
            const savedState = this.sectionStateService.isSectionOpen(this.sectionId());
            this.isOpen.set(savedState);
        } else {
            // Если есть глобальное состояние — используем его
            this.isOpen.set(globalState);
        }

        // Помечаем как инициализированную после загрузки состояния
        this.isInitialized = true;
    }

    /**
     * @inheritdoc.
     */
    public ngOnDestroy(): void {
        // Ничего не нужно делать - секции управляются через SectionStateService
    }

    /**
     * Переключает состояние открытости секции.
     * Сбрасывает глобальное состояние при локальном переключении.
     */
    protected toggle(): void {
        // Сбрасываем глобальное состояние при локальном переключении
        this.globalExpandService.set(undefined);

        const newState = !this.isOpen();
        this.isOpen.set(newState);
        this.sectionStateService.updateSectionState(this.sectionId(), newState);

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
