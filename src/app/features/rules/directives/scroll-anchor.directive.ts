import { Directive, input, ElementRef, inject, OnInit, OnDestroy } from '@angular/core';
import { ScrollService } from '../services/scroll.service';
import { SECTION_ID } from '../tokens/section-id.token';

/**
 * Директива для автоматической регистрации якоря в ScrollService.
 */
@Directive({
    selector: '[appScrollAnchor]',
    standalone: true,
})
export class ScrollAnchorDirective implements OnInit, OnDestroy {
    /**
     * ID якоря для регистрации.
     *
     * Если не указан, берется из атрибута anchor родительского элемента.
     */
    readonly appScrollAnchor = input<string | undefined>(undefined);

    /**
     * ID секции в которой находится якорь (опционально).
     *
     * Используется для автоматического раскрытия секции при скролле.
     * Если не указан, получается через DI токен от родительской секции.
     */
    readonly sectionId = input<string | undefined>(undefined);

    /**
     * ID секции из DI токена.
     */
    private readonly sectionIdFromToken = inject(SECTION_ID);

    /**
     * Сервис скроллинга.
     */
    private readonly scrollService = inject(ScrollService);

    /**
     * Ссылка на DOM элемент.
     */
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Функция для удаления регистрации.
     */
    private unregisterFn?: () => void;

    /**
     * @inheritdoc
     */
    public ngOnInit(): void {
        const element = this.elementRef.nativeElement;

        // Если anchorId не передан напрямую, пробуем получить из атрибута
        let anchorId = this.appScrollAnchor();
        if (!anchorId) {
            anchorId = element.getAttribute('anchor') || undefined;
        }

        // Если все равно нет anchorId, пробуем у родителя
        if (!anchorId) {
            const parent = element.parentElement;
            if (parent) {
                anchorId = parent.getAttribute('anchor') || undefined;
            }
        }

        // Если нет anchorId - просто пропускаем регистрацию (многие параграфы без якорей)
        if (!anchorId) {
            return;
        }

        // Если sectionId не передан напрямую, получаем из токена
        const sectionId = this.sectionId() ?? this.sectionIdFromToken();

        // Регистрируем якорь в сервисе
        this.unregisterFn = this.scrollService.registerAnchor(anchorId, element, sectionId);
    }

    /**
     * @inheritdoc
     */
    public ngOnDestroy(): void {
        this.unregisterFn?.();
    }
}
