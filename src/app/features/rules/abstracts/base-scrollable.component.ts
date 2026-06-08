import { Directive, inject, output } from '@angular/core';
import { ScrollService } from '../services/scroll.service';

/**
 * Абстрактный базовый класс для компонентов с возможностью скролла.
 * Содержит общую бизнес-логику для прокрутки к элементам.
 */
@Directive()
export abstract class BaseScrollableComponent {
    /**
     * Сервис для выполнения скролла.
     */
    private readonly scrollService = inject(ScrollService);

    /**
     * Событие прокрутки к элементу.
     */
    public scrollTo = output<string>();

    /**
     * Выполняет прокрутку к элементу.
     *
     * @param elementId - Идентификатор элемента
     */
    public scrollToElement(elementId: string): void {
        this.scrollService.scrollToElement(elementId);
    }
}
