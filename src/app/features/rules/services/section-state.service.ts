import { Injectable, signal } from '@angular/core';

/**
 * Информация о секции для построения иерархии.
 */
interface SectionInfo {
    /** ID секции */
    sectionId: string;
    /** ID родительской секции (если есть) */
    parentId?: string;
}

/**
 * Сервис для управления состоянием секций правил.
 * Позволяет раскрывать секции из любого места приложения.
 * Хранит иерархию секций для автоматического раскрытия родительских.
 */
@Injectable({
    providedIn: 'root',
})
export class SectionStateService {
    /**
     * Состояния секций: sectionId -> isOpen
     */
    private readonly sectionStates = signal<Map<string, boolean>>(new Map());

    /**
     * Регистрация секций: sectionId -> SectionInfo
     */
    private readonly sectionRegistry = signal<Map<string, SectionInfo>>(new Map());

    /**
     * Просмотренные подсекции: parentId -> Set<subsectionId>
     */
    private readonly watchedSubsections = signal<Map<string, Set<string>>>(new Map());

    /**
     * Раскрывает секцию по её sectionId.
     *
     * @param sectionId - Идентификатор секции
     */
    public expandSection(sectionId: string): void {
        const states = new Map(this.sectionStates());
        states.set(sectionId, true);
        this.sectionStates.set(states);
    }

    /**
     * Обновляет состояние секции (используется для синхронизации с локальным состоянием компонента).
     *
     * @param sectionId - Идентификатор секции
     * @param isOpen - Новое состояние
     */
    public updateSectionState(sectionId: string, isOpen: boolean): void {
        const states = new Map(this.sectionStates());
        states.set(sectionId, isOpen);
        this.sectionStates.set(states);
    }

    /**
     * Проверяет, раскрыта ли секция.
     *
     * @param sectionId - Идентификатор секции
     * @returns true если секция раскрыта
     */
    public isSectionOpen(sectionId: string): boolean {
        return this.sectionStates().get(sectionId) ?? false;
    }

    /**
     * Регистрирует секцию в системе.
     *
     * @param sectionId - ID секции
     * @param parentId - ID родительской секции (опционально)
     */
    public registerSection(sectionId: string, parentId?: string): void {
        const registry = new Map(this.sectionRegistry());
        registry.set(sectionId, { sectionId, parentId });
        this.sectionRegistry.set(registry);
    }

    /**
     * Раскрывает все секции на пути к целевой секции.
     * Использует зарегистрированную иерархию вместо DOM traversal.
     *
     * @param targetSectionId - ID целевой секции
     */
    public expandPathTo(targetSectionId: string): void {
        const registry = this.sectionRegistry();
        const path = this.buildPathTo(targetSectionId, registry);

        // Раскрываем все секции в пути
        path.forEach((id) => {
            this.expandSection(id);
        });
    }

    /**
     * Строит путь к целевой секции, поднимаясь вверх по иерархии.
     *
     * @param targetSectionId - ID целевой секции
     * @param registry - Реестр всех секций
     * @returns Массив ID секций от корня к цели
     */
    private buildPathTo(targetSectionId: string, registry: Map<string, SectionInfo>): string[] {
        const path: string[] = [];
        let currentId: string | undefined = targetSectionId;

        while (currentId) {
            path.unshift(currentId);
            const sectionInfo = registry.get(currentId);
            currentId = sectionInfo?.parentId;
        }

        return path;
    }

    /**
     * Регистрирует просмотренную подсекцию.
     *
     * @param parentId - ID родительской секции
     * @param subsectionId - ID просмотренной подсекции
     */
    public markSubsectionWatched(parentId: string, subsectionId: string): void {
        const watched = new Map(this.watchedSubsections());
        const existing = watched.get(parentId) ?? new Set<string>();
        existing.add(subsectionId);
        watched.set(parentId, existing);
        this.watchedSubsections.set(watched);
    }

    /**
     * Проверяет, все ли подсекции родительской секции просмотрены.
     *
     * @param parentId - ID родительской секции
     * @returns true если все подсекции просмотрены
     */
    public areAllSubsectionsWatched(parentId: string): boolean {
        const allSubsectionIds = this.getAllSubsectionIds(parentId);
        if (allSubsectionIds.length === 0) {
            return true;
        }

        const watchedSet = this.watchedSubsections().get(parentId) ?? new Set<string>();
        return allSubsectionIds.every((id) => watchedSet.has(id));
    }

    /**
     * Получает все ID подсекций заданной родительской секции.
     *
     * @param parentId - ID родительской секции
     * @returns Массив ID подсекций
     */
    private getAllSubsectionIds(parentId: string): string[] {
        return Array.from(this.sectionRegistry().entries())
            .filter(([, info]) => info.parentId === parentId)
            .map(([sectionId]) => sectionId);
    }
}
