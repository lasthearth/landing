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
 * Время, за которое успевает раскрыться свёрнутая секция (мс).
 */
const EXPAND_SETTLE_DELAY = 380;

/**
 * Через сколько проверять, что цель осталась на месте после прокрутки (мс).
 */
const SCROLL_CORRECTION_DELAY = 700;

/**
 * Допустимое отклонение цели от центра экрана (px).
 */
const SCROLL_TOLERANCE = 120;

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
        const element = document.getElementById(elementId);

        if (!element) {
            return;
        }

        this.scrollToNode(element, options);
    }

    /**
     * Выполняет скролл к DOM-элементу правил.
     *
     * Раскрывает свёрнутые секции на пути к элементу и, если раскрытие нужно,
     * ждёт окончания анимации, чтобы не промахнуться мимо цели.
     *
     * @param element - DOM элемент
     * @param options - Опции скролла
     */
    public scrollToNode(element: HTMLElement, options: ScrollOptions = {}): void {
        const opts = { ...DEFAULT_SCROLL_OPTIONS, ...options };
        const needsExpand = !!element.closest('tui-expand:not(._expanded)');

        // Раскрываем секции через DOM traversal
        this.expandSectionsForElement(element);

        setTimeout(
            () => {
                this.performScroll(element, opts);
            },
            needsExpand ? Math.max(opts.delay ?? 0, EXPAND_SETTLE_DELAY) : opts.delay
        );
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

        // Пока докручиваем, над целью могут доезжать раскрывающиеся секции —
        // если цель уехала от нужной позиции, поправляем один раз.
        if (options.block === 'center') {
            setTimeout(() => {
                const rect = element.getBoundingClientRect();
                const offset = rect.top + rect.height / 2 - window.innerHeight / 2;
                if (rect.height < window.innerHeight && Math.abs(offset) > SCROLL_TOLERANCE) {
                    element.scrollIntoView({ behavior: options.behavior, block: 'center', inline: options.inline });
                }
            }, SCROLL_CORRECTION_DELAY);
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
                }, 3100);
            });
        });
    }
}
