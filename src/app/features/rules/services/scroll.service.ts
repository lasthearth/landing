import { Injectable, signal, DestroyRef, inject } from '@angular/core';
import { SectionStateService } from './section-state.service';

/**
 * Информация о зарегистрированном якоре.
 */
interface AnchorInfo {
    /** ID якоря */
    anchorId: string;
    /** ID секции в которой находится якорь */
    sectionId?: string;
    /** Ссылка на DOM элемент */
    element: HTMLElement;
}

/**
 * Опции для скроллирования к якорю.
 */
export interface ScrollOptions {
    /** Поведение скролла */
    behavior?: ScrollBehavior;
    /** Позиция элемента во вьюпорте */
    block?: ScrollLogicalPosition;
    /** Позиция по горизонтали */
    inline?: ScrollLogicalPosition;
    /** Добавлять ли анимацию подсветки */
    animate?: boolean;
    /** Задержка перед скроллом (мс) */
    delay?: number;
}

/**
 * Опции по умолчанию для скроллирования.
 */
const DEFAULT_SCROLL_OPTIONS: ScrollOptions = {
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
    animate: true,
    delay: 50,
};

/**
 * Сервис для управления скроллингом к якорям.
 *
 * Регистрирует якоря и автоматически раскрывает секции при скролле.
 */
@Injectable({
    providedIn: 'root',
})
export class ScrollService {
    /**
     * Карта зарегистрированных якорей: anchorId -> AnchorInfo.
     */
    private readonly anchors = signal<Map<string, AnchorInfo>>(new Map());

    /**
     * Сервис для управления состоянием секций.
     */
    private readonly sectionStateService = inject(SectionStateService);

    /**
     * Регистрирует якорь в системе.
     *
     * @param anchorId - ID якоря
     * @param element - DOM элемент якоря
     * @param sectionId - ID секции (опционально)
     * @returns Функция для удаления регистрации
     */
    public registerAnchor(anchorId: string, element: HTMLElement, sectionId?: string): () => void {
        const anchors = new Map(this.anchors());
        anchors.set(anchorId, { anchorId, element, sectionId });
        this.anchors.set(anchors);

        return () => this.unregisterAnchor(anchorId);
    }

    /**
     * Удаляет регистрацию якоря.
     *
     * @param anchorId - ID якоря
     */
    public unregisterAnchor(anchorId: string): void {
        const anchors = new Map(this.anchors());
        anchors.delete(anchorId);
        this.anchors.set(anchors);
    }

    /**
     * Выполняет скролл к зарегистрированному якорю.
     *
     * Автоматически раскрывает все секции на пути к якорю.
     *
     * @param anchorId - ID якоря
     * @param options - Опции скролла
     */
    public scrollToAnchor(anchorId: string, options: ScrollOptions = {}): void {
        const opts = { ...DEFAULT_SCROLL_OPTIONS, ...options };
        const anchorInfo = this.anchors().get(anchorId);

        if (!anchorInfo) {
            return;
        }

        // Раскрываем секцию если указана
        if (anchorInfo.sectionId) {
            this.expandSections(anchorInfo.sectionId);
        }

        setTimeout(() => {
            this.performScroll(anchorInfo.element, opts);
        }, opts.delay);
    }

    /**
     * Выполняет скролл к элементу по его ID (обратная совместимость).
     *
     * @param elementId - ID элемента
     * @param options - Опции скролла
     */
    public scrollToElement(elementId: string, options: ScrollOptions = {}): void {
        const opts = { ...DEFAULT_SCROLL_OPTIONS, ...options };
        const element = document.getElementById(elementId);

        if (!element) {
            return;
        }

        // Раскрываем секции через DOM traversal
        this.expandSectionsForElement(element);

        setTimeout(() => {
            this.performScroll(element, opts);
        }, opts.delay);
    }

    /**
     * Раскрывает все секции на пути к целевой секции.
     *
     * @param targetSectionId - ID целевой секции
     */
    private expandSections(targetSectionId: string): void {
        this.sectionStateService.expandPathTo(targetSectionId);
    }

    /**
     * Раскрывает все секции для элемента через DOM traversal.
     *
     * @param element - DOM элемент
     */
    private expandSectionsForElement(element: HTMLElement): void {
        const sectionIds: string[] = [];
        let currentElement: HTMLElement | null = element;

        // Поднимаемся вверх по дереву и собираем все sectionId
        while (currentElement) {
            // Ищем родительские rule-section
            const ruleSection = currentElement.closest('app-rule-section') as HTMLElement | null;
            if (ruleSection) {
                const sectionId = ruleSection.getAttribute('sectionid');
                if (sectionId) {
                    sectionIds.unshift(sectionId);
                }
            }

            // Переходим к следующему родителю
            currentElement = ruleSection?.parentElement || currentElement.parentElement;

            // Защита от бесконечного цикла
            if (currentElement === document.body) {
                break;
            }
        }

        // Раскрываем все секции через сервис
        sectionIds.forEach((id) => {
            this.sectionStateService.expandSection(id);
        });
    }

    /**
     * Выполняет непосредственный скролл к элементу.
     *
     * @param element - DOM элемент
     * @param options - Опции скролла
     */
    private performScroll(element: HTMLElement, options: ScrollOptions): void {
        element.scrollIntoView({
            behavior: options.behavior,
            block: options.block,
            inline: options.inline,
        });

        if (options.animate) {
            this.addShakeAnimation(element);
        }
    }

    /**
     * Добавляет анимацию "встряски" элементу.
     *
     * @param element - DOM элемент
     */
    private addShakeAnimation(element: HTMLElement): void {
        // Сбрасываем старую анимацию
        element.classList.remove('shake-animation');

        // Используем requestAnimationFrame для корректного перезапуска анимации
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                element.classList.add('shake-animation');

                setTimeout(() => {
                    element.classList.remove('shake-animation');
                }, 500);
            });
        });
    }
}
