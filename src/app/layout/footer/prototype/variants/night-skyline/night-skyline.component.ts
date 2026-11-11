import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { FooterPrototypeState } from '../../footer-prototype-state.service';

/**
 * Вариант подвала «Ночной силуэт».
 *
 * Над подвалом — ночное небо: звёзды мерцают, луна светит, слоёные
 * силуэты (деревня, ели, стена) оседают с прокруткой: чем ближе слой,
 * тем сильнее он сдвинут. CTA «В Discord» притягивается к указателю.
 * При `prefers-reduced-motion` слои стоят на месте, небо статично.
 */
@Component({
    standalone: true,
    selector: 'app-footer-night-skyline',
    imports: [RouterLink, TranslatePipe, ImageLoaderComponent],
    templateUrl: './night-skyline.component.html',
    styleUrl: './night-skyline.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NightSkylineComponent {
    /**
     * Данные подвала из общего сервиса прототипа.
     */
    protected readonly state = inject(FooterPrototypeState);

    /**
     * Все три растровых силуэта загрузились: SVG-фолбэки и CSS-круг луны
     * прячутся, чтобы векторный и растровый контуры не двоились.
     */
    protected readonly hasArt = signal(false);

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly skyBand = viewChild<ElementRef<HTMLElement>>('skyBand');

    private readonly destroyRef = inject(DestroyRef);

    /** Идентификатор запланированного пересчёта оседания; 0 — пересчёта нет. */
    private scrollRaf = 0;

    /** Подвал во вьюпорте: вне него прокрутка не тратит кадры. */
    private isWatching = false;

    /** Наблюдатель видимости подвала. */
    private observer?: IntersectionObserver;

    constructor() {
        afterNextRender(() => {
            this.preloadArt();
            this.initParallax();
        });

        this.destroyRef.onDestroy(() => this.teardown());
    }

    /**
     * Греет кэш трёх PNG силуэтов и взводит {@link hasArt}, когда все три
     * пришли. Любая ошибка оставляет сигнал ложным: остаются SVG-фолбэки.
     */
    private preloadArt(): void {
        const sources = [
            '/footer-assets/skyline-far.png',
            '/footer-assets/skyline-village.png',
            '/footer-assets/skyline-wall.png',
        ];
        let left = sources.length;

        for (const src of sources) {
            const image = new Image();

            image.onload = () => {
                left -= 1;

                if (left === 0) {
                    this.hasArt.set(true);
                }
            };
            image.onerror = () => {
                left = -1;
            };
            image.src = src;
        }
    }

    /**
     * Притягивает CTA к указателю: сдвиг не больше 7px по горизонтали.
     *
     * @param event Событие движения указателя над зоной CTA.
     */
    protected onCtaMove(event: MouseEvent): void {
        const zone = event.currentTarget;

        if (!(zone instanceof HTMLElement)) {
            return;
        }

        const rect = zone.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width);
        const dy = (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height);

        zone.style.setProperty('--mag-x', `${(Math.max(-0.5, Math.min(0.5, dx)) * 7).toFixed(1)}px`);
        zone.style.setProperty('--mag-y', `${(Math.max(-0.5, Math.min(0.5, dy)) * 5).toFixed(1)}px`);
    }

    /**
     * Возвращает CTA на место после ухода указателя.
     *
     * @param event Событие ухода указателя из зоны CTA.
     */
    protected onCtaLeave(event: MouseEvent): void {
        const zone = event.currentTarget;

        if (!(zone instanceof HTMLElement)) {
            return;
        }

        zone.style.setProperty('--mag-x', '0px');
        zone.style.setProperty('--mag-y', '0px');
    }

    /**
     * Вешает наблюдателя видимости и слушатель прокрутки.
     * При `prefers-reduced-motion` слои остаются в конечном положении.
     */
    private initParallax(): void {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        if (typeof IntersectionObserver === 'undefined') {
            return;
        }

        this.observer = new IntersectionObserver(
            (entries) => {
                this.isWatching = entries.some((entry) => entry.isIntersecting);

                if (this.isWatching) {
                    this.scheduleSettle();
                }
            },
            { rootMargin: '120px 0px' }
        );
        this.observer.observe(this.host.nativeElement);

        window.addEventListener('scroll', this.onScroll, { passive: true });
    }

    /**
     * Снимает слушатели и наблюдателей.
     */
    private teardown(): void {
        window.removeEventListener('scroll', this.onScroll);
        this.observer?.disconnect();

        if (this.scrollRaf !== 0) {
            cancelAnimationFrame(this.scrollRaf);
            this.scrollRaf = 0;
        }
    }

    /** Прокрутка видимого подвала: пересчёт оседания раз в кадр. */
    private readonly onScroll = (): void => {
        if (this.isWatching) {
            this.scheduleSettle();
        }
    };

    /** Планирует пересчёт оседания на ближайший кадр. */
    private scheduleSettle(): void {
        if (this.scrollRaf !== 0) {
            return;
        }

        this.scrollRaf = requestAnimationFrame(() => {
            this.scrollRaf = 0;
            this.updateSettle();
        });
    }

    /**
     * Пишет в `--sky-settle` прогресс входа неба во вьюпорт (0..1).
     * Слои сдвигаются по этому значению каждый со своей амплитудой.
     */
    private updateSettle(): void {
        const band = this.skyBand()?.nativeElement;

        if (!band) {
            return;
        }

        const rect = band.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight * 0.6)));

        this.host.nativeElement.style.setProperty('--sky-settle', progress.toFixed(3));
    }
}
