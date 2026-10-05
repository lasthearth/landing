import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    HostListener,
    inject,
    input,
    model,
    output,
    viewChild,
    DOCUMENT,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button';
import { ImageViewerItem } from './image-viewer-item';

/**
 * Минимальный сдвиг пальца для перелистывания, px.
 */
const SWIPE_THRESHOLD = 50;

/**
 * Полноэкранный просмотрщик картинок.
 *
 * Стрелки ←/→ (кнопки, клавиатура, свайп) листают, Esc и клик по фону закрывают.
 * Пока просмотрщик открыт, прокрутка страницы заблокирована; после закрытия
 * фокус возвращается на элемент, с которого его открыли. Соседние картинки
 * подгружаются заранее, чтобы листание было мгновенным.
 */
@Component({
    standalone: true,
    selector: 'app-image-viewer',
    imports: [TuiIcon, TranslatePipe, RelativeTimeComponent, ShareButtonComponent],
    templateUrl: './image-viewer.component.html',
    styleUrl: './image-viewer.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageViewerComponent {
    /**
     * Документ.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Кнопка закрытия — получает фокус при открытии.
     */
    private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');

    /**
     * Элемент, который был в фокусе до открытия.
     */
    private readonly previousFocus = this.document.activeElement as HTMLElement | null;

    /**
     * Точка начала свайпа.
     */
    private swipeStartX: number | null = null;

    /**
     * Все картинки.
     */
    public readonly images = input.required<ImageViewerItem[]>();

    /**
     * Индекс текущей картинки (двусторонняя привязка).
     */
    public readonly index = model.required<number>();

    /**
     * Просмотрщик закрыт.
     */
    public readonly closed = output<void>();

    /**
     * Текущая картинка.
     */
    protected readonly current = computed(() => this.images()[this.index()] ?? null);

    /**
     * Есть ли что листать.
     */
    protected readonly hasMany = computed(() => this.images().length > 1);

    public constructor() {
        const body = this.document.body;
        const previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        afterNextRender(() => this.closeButton()?.nativeElement.focus());

        inject(DestroyRef).onDestroy(() => {
            body.style.overflow = previousOverflow;
            this.previousFocus?.focus?.();
        });

        // Заранее грузим соседние картинки.
        effect(() => {
            const images = this.images();
            const index = this.index();

            for (const offset of [-1, 1]) {
                const neighbour = images[(index + offset + images.length) % images.length];

                if (neighbour && typeof Image !== 'undefined') {
                    new Image().src = neighbour.src;
                }
            }
        });
    }

    /**
     * Следующая картинка (по кругу).
     */
    protected next(): void {
        const count = this.images().length;
        this.index.set((this.index() + 1) % count);
    }

    /**
     * Предыдущая картинка (по кругу).
     */
    protected prev(): void {
        const count = this.images().length;
        this.index.set((this.index() - 1 + count) % count);
    }

    /**
     * Закрывает просмотрщик.
     */
    protected close(): void {
        this.closed.emit();
    }

    /**
     * Клик по фону (не по картинке и не по кнопкам) закрывает просмотрщик.
     *
     * @param event Событие клика.
     */
    protected onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.close();
        }
    }

    /**
     * Начало свайпа.
     *
     * @param event Событие указателя.
     */
    protected onPointerDown(event: PointerEvent): void {
        this.swipeStartX = event.clientX;
    }

    /**
     * Конец свайпа: листает при достаточном сдвиге.
     *
     * @param event Событие указателя.
     */
    protected onPointerUp(event: PointerEvent): void {
        if (this.swipeStartX === null || !this.hasMany()) {
            return;
        }

        const delta = event.clientX - this.swipeStartX;
        this.swipeStartX = null;

        if (Math.abs(delta) >= SWIPE_THRESHOLD) {
            if (delta < 0) {
                this.next();
            } else {
                this.prev();
            }
        }
    }

    /**
     * Клавиатура: Esc — закрыть, ←/→ — листать.
     *
     * @param event Событие клавиатуры.
     */
    @HostListener('document:keydown', ['$event'])
    protected onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
        } else if (event.key === 'ArrowRight' && this.hasMany()) {
            event.preventDefault();
            this.next();
        } else if (event.key === 'ArrowLeft' && this.hasMany()) {
            event.preventDefault();
            this.prev();
        }
    }
}
