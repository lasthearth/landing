import { afterNextRender, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { RevealDirective } from '@shared/lib/directives';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { FooterPrototypeState } from '../../footer-prototype-state.service';

/**
 * Вариант подвала «Врата очага».
 *
 * Верхняя кромка подвала — рваный обгоревший край пергамента, вырезанный
 * `clip-path`. При входе подвала во вьюпорт по кромке пробегает янтарная
 * линия, контент раскрывается каскадом `[appReveal]`, крупный вензель
 * «LAST HEARTH» проявляется маской снизу вверх один раз.
 *
 * Скрытое стартовое состояние вензеля и линии ставит класс-«взвод»
 * (`gate--armed`) уже после гидратации: без JS подвал обязан быть виден.
 */
@Component({
    standalone: true,
    selector: 'app-footer-hearth-gate',
    imports: [RouterLink, TranslatePipe, ImageLoaderComponent, RevealDirective],
    templateUrl: './hearth-gate.component.html',
    styleUrl: './hearth-gate.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HearthGateComponent {
    /**
     * Данные подвала из общего сервиса прототипа.
     */
    protected readonly state = inject(FooterPrototypeState);

    /**
     * Линия пробежала, вензель проявился. Ставится один раз.
     */
    protected readonly isLit = signal(false);

    /**
     * Скрипт взвёл скрытое стартовое состояние. До взвода всё видно.
     */
    protected readonly isArmed = signal(false);

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly destroyRef = inject(DestroyRef);

    /** Наблюдатель входа подвала во вьюпорт. */
    private observer?: IntersectionObserver;

    constructor() {
        afterNextRender(() => this.initReveal());

        this.destroyRef.onDestroy(() => this.observer?.disconnect());
    }

    /**
     * Взводит стартовое состояние и ждёт пересечения с вьюпортом.
     * При `prefers-reduced-motion` движение не запускается вовсе.
     */
    private initReveal(): void {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.isLit.set(true);

            return;
        }

        if (typeof IntersectionObserver === 'undefined') {
            this.isLit.set(true);

            return;
        }

        this.isArmed.set(true);
        this.observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }

                this.isLit.set(true);
                this.observer?.disconnect();
            },
            { threshold: 0.2 }
        );
        this.observer.observe(this.host.nativeElement);
    }
}