import { Injectable, signal, inject } from '@angular/core';
import { SectionStateService } from './section-state.service';

/**
 * Сервис для глобального управления состоянием раскрытия всех секций правил.
 * Глобальное состояние означает "изменить состояние всех секций на X" (массовое действие),
 * а не "зафиксировать все секции в состоянии X" (режим работы).
 */
@Injectable({
    providedIn: 'root',
})
export class GlobalExpandService {
    /**
     * Сервис управления состоянием секций.
     */
    private readonly sectionStateService = inject(SectionStateService);

    /**
     * Реестр зарегистрированных секций.
     */
    private readonly sectionRegistry = signal<Map<string, { sectionId: string; parentId?: string }>>(new Map());

    /**
     * Состояние "раскрыть всё".
     * undefined - глобальное действие не применялось
     * true - было применено "раскрыть всё"
     * false - было применено "скрыть всё"
     * Используется только для отображения состояния кнопки в UI.
     */
    private readonly isAllExpanded = signal<boolean | undefined>(undefined);

    /**
     * Возвращает текущее глобальное состояние.
     */
    public readonly globalExpandState = this.isAllExpanded.asReadonly();

    /**
     * Регистрирует секцию для глобального управления.
     */
    public registerSection(sectionId: string, parentId?: string): void {
        const registry = new Map(this.sectionRegistry());
        registry.set(sectionId, { sectionId, parentId });
        this.sectionRegistry.set(registry);
    }

    /**
     * Переключает глобальное состояние.
     * undefined → true → false → true → ...
     * Применяет массовое действие ко всем зарегистрированным секциям.
     */
    public toggle(): void {
        this.isAllExpanded.update((value) => {
            if (value === undefined) {
                this.applyState(true);
                return true;
            }
            if (value === true) {
                this.applyState(false);
                return false;
            }
            this.applyState(true);
            return true;
        });
    }

    /**
     * Применяет состояние ко всем зарегистрированным секциям.
     * Изменяет локальное состояние каждой секции.
     */
    private applyState(state: boolean): void {
        const registry = this.sectionRegistry();
        registry.forEach((info) => {
            this.sectionStateService.updateSectionState(info.sectionId, state);
        });
    }

    /**
     * Устанавливает глобальное состояние.
     * Если состояние задано - применяет массовое действие ко всем секциям.
     */
    public set(state: boolean | undefined): void {
        if (state !== undefined) {
            this.applyState(state);
        }
        this.isAllExpanded.set(state);
    }
}
