import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { RevealDirective } from '@shared/lib/directives';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { FooterPrototypeState } from '../../footer-prototype-state.service';

/**
 * Вариант подвала «Врата очага».
 *
 * Подвал закрыт целым листом пергамента. Прокрутка к концу страницы один раз
 * проводит фронт горения сверху вниз: лист исчезает над фронтом, контент
 * открывается по мере прогорания. Внизу остаётся угольная кромка с тлением
 * по линии разрыва. Ход фронта — число `--gate-burn` от 0 до 1 на хосте,
 * без смены сигнала: стили читают переменную напрямую.
 *
 * Без скрипта и при `prefers-reduced-motion` переменная стоит в 1: подвал
 * показан догоревшим, ничего не спрятано.
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
     * Скрипт взвёл стартовое состояние: лист целый. До взвода всё видно.
     */
    protected readonly isArmed = signal(false);

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly destroyRef = inject(DestroyRef);

    /** Достигнутый максимум хода горения: назад фронт не идёт. */
    private burn = 0;

    /** Кадр прокрутки заказан, но ещё не отработан. */
    private frame = 0;

    constructor() {
        afterNextRender(() => this.initBurn());

        this.destroyRef.onDestroy(() => {
            cancelAnimationFrame(this.frame);
            window.removeEventListener('scroll', this.onScroll, { capture: true });
            window.removeEventListener('resize', this.onScroll);
            window.removeEventListener('load', this.onScroll);
        });
    }

    /**
     * Ставит лист целым и вешает счёт хода на прокрутку.
     * При `prefers-reduced-motion` движение не запускается вовсе.
     */
    private initBurn(): void {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        this.setBurn(0);
        this.isArmed.set(true);
        window.addEventListener('scroll', this.onScroll, { capture: true, passive: true });
        window.addEventListener('resize', this.onScroll);
        window.addEventListener('load', this.onScroll);
        this.onScroll();
    }

    /** Заказывает один счёт на кадр: прокрутка не плодит лишних проходов. */
    private onScroll = (): void => {
        if (this.frame) {
            return;
        }

        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.measure();
        });
    };

    /**
     * Ход фронта — доля пути от входа подвала во вьюпорт до конца страницы.
     * Внизу страницы фронт дошёл до кромки: `--gate-burn` равен 1.
     */
    private measure(): void {
        const rect = this.host.nativeElement.getBoundingClientRect();
        const top = rect.top + window.scrollY;
        const span = document.documentElement.scrollHeight - top;

        if (span <= 0) {
            return;
        }

        const passed = window.scrollY + window.innerHeight - top;
        this.setBurn(Math.max(this.burn, Math.min(1, Math.max(0, passed / span))));
    }

    /** Пишет ход на хост: стили варианта читают его без перерисовки Angular. */
    private setBurn(value: number): void {
        this.burn = value;
        this.host.nativeElement.style.setProperty('--gate-burn', value.toFixed(4));
    }
}
