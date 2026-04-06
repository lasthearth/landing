import { Injectable, signal } from '@angular/core';

/**
 * Сервис для глобального управления состоянием раскрытия всех секций правил.
 */
@Injectable({
    providedIn: 'root',
})
export class GlobalExpandService {
    /**
     * Состояние "раскрыть всё".
     * undefined - не задано (используется локальное состояние)
     * true - все принудительно открыты
     * false - все принудительно закрыты
     */
    private readonly isAllExpanded = signal<boolean | undefined>(undefined);

    /**
     * Возвращает текущее глобальное состояние.
     */
    public readonly globalExpandState = this.isAllExpanded.asReadonly();

    /**
     * Переключает глобальное состояние.
     * undefined → true → false → true → ...
     */
    public toggle(): void {
        this.isAllExpanded.update((value) => {
            if (value === undefined) return true;
            if (value === true) return false;
            return true;
        });
    }

    /**
     * Устанавливает глобальное состояние.
     */
    public set(state: boolean | undefined): void {
        this.isAllExpanded.set(state);
    }
}
