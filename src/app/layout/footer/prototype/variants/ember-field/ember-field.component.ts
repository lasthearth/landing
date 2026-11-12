import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    DOCUMENT,
    ElementRef,
    inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { FooterPrototypeState } from '../../footer-prototype-state.service';

/** Доля высоты подвала, за которую фронт проходит весь лист. */
const BURN_SPAN = 0.85;

/** Доля полосы фронта, скрытая под линией огня. */
const FRONT_SINK = 0.7;

/** Тяжёлые растры листа и фронта: предзагрузка до прихода прокрутки. */
const PRELOADS = ['/footer-assets/parchment-sheet.webp', '/footer-assets/burn-front.webp'];

@Component({
    standalone: true,
    selector: 'app-footer-ember-field',
    imports: [RouterLink, TranslatePipe, ImageLoaderComponent],
    templateUrl: './ember-field.component.html',
    styleUrl: './ember-field.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmberFieldComponent {
    /**
     * Данные подвала из общего сервиса прототипа.
     */
    protected readonly state = inject(FooterPrototypeState);

    /** Индексы шести угольков у кромки. */
    protected readonly embers = [0, 1, 2, 3, 4, 5];

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private frame = 0;

    constructor() {
        afterNextRender(() => {
            this.addPreloads();
            const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduced) {
                this.apply(1);
                return;
            }
            const onScroll = (): void => this.schedule();
            window.addEventListener('scroll', onScroll, { passive: true });
            window.addEventListener('resize', onScroll);
            this.destroyRef.onDestroy(() => {
                window.removeEventListener('scroll', onScroll);
                window.removeEventListener('resize', onScroll);
                cancelAnimationFrame(this.frame);
            });
            this.schedule();
        });
    }

    /**
     * Прогресс горения из положения подвала в окне: 0 — кромка подвала
     * у низа окна, 1 — подвал полностью в окне и лист догорел.
     */
    private schedule(): void {
        if (this.frame !== 0) {
            return;
        }
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            const rect = this.host.nativeElement.getBoundingClientRect();
            const entered = window.innerHeight - rect.top;
            const raw = Math.min(Math.max(entered / (rect.height * BURN_SPAN), 0), 1);
            this.apply(raw * raw * (3 - 2 * raw));
        });
    }

    private apply(progress: number): void {
        const el = this.host.nativeElement;
        const strip = el.querySelector<HTMLElement>('.burn__front')?.getBoundingClientRect().height ?? 208;
        el.style.setProperty('--burn-p', progress.toFixed(4));
        el.style.setProperty(
            '--burn-y',
            `${(progress * (el.getBoundingClientRect().height + strip * FRONT_SINK)).toFixed(1)}px`
        );
    }

    private addPreloads(): void {
        for (const href of PRELOADS) {
            if (this.document.querySelector(`link[href="${href}"]`)) {
                continue;
            }
            const link = this.document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.type = 'image/webp';
            link.href = href;
            this.document.head.appendChild(link);
        }
    }
}
