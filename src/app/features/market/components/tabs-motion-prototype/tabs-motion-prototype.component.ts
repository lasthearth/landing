import { NgTemplateOutlet } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    input,
    signal,
    viewChildren,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@core/i18n';
import { PrototypeSwitcherComponent } from '@shared/ui/prototype-switcher';
import { KitsComponent } from '../kits/kits.component';
import { SpecialComponent } from '../special/special.component';
import { TitlesComponent } from '../titles/titles.component';

/**
 * Ключи вариантов прототипа движения вкладок магазина.
 */
export const TABS_MOTION_VARIANTS = ['A', 'B', 'C', 'D'] as const;

/**
 * Ключ варианта прототипа движения вкладок магазина.
 */
export type TabsMotionVariant = (typeof TABS_MOTION_VARIANTS)[number];

/**
 * ПРОТОТИП, НЕ ПРОДАКШН. Четыре несовместимых способа двигать переключатель
 * «Привилегии / Наборы / Особое» на боевой странице `/market?variant=`.
 *
 * Вопрос: чем должен жить переход между вкладками — плашкой-индикатором,
 * направлением контента, заменой карточки или ничем (как сейчас).
 * Варианты переключаются плавающей панелью и стрелками клавиатуры.
 * Когда вариант выбран: победившее движение переписать в
 * `market.component` по правилам `docs/DESIGN_SYSTEM.md`, а этот компонент
 * вместе с `shared/ui/prototype-switcher` удалить (ветка-черновик сохранит).
 *
 * - A «Плашка едет»: индикатор физически переезжает и растягивается между
 *   вкладками пружиной, контент гаснет и проявляется без движения.
 * - B «Контент едет»: индикатор переключается мгновенно, контент уезжает
 *   и въезжает по горизонтали в сторону перехода (сначала выход, потом вход).
 * - C «Палуба»: уходящая панель оседает масштабом и гаснет, входящая
 *   поднимается из 0.97 — контент как физическая карточка.
 * - D «Как сейчас»: мгновенная плашка и появление контента снизу, то есть
 *   текущее поведение прода.
 */
@Component({
    selector: 'app-market-tabs-motion-prototype',
    standalone: true,
    imports: [NgTemplateOutlet, TranslatePipe, PrototypeSwitcherComponent, TitlesComponent, KitsComponent, SpecialComponent],
    templateUrl: './tabs-motion-prototype.component.html',
    styleUrl: './tabs-motion-prototype.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsMotionPrototypeComponent {
    /**
     * Ключ варианта из адреса (`?variant=`).
     */
    public readonly variant = input<TabsMotionVariant>('A');

    /**
     * Ключи для панели переключения.
     */
    protected readonly variantKeys: string[] = [...TABS_MOTION_VARIANTS];

    /**
     * Имена вариантов для панели переключения.
     */
    protected readonly variantNames: Record<string, string> = {
        A: 'плашка едет, контент спокоен',
        B: 'контент едет по направлению',
        C: 'палуба: карточка заменяется',
        D: 'как сейчас в проде',
    };

    /**
     * Подписи вкладок — те же ключи словаря, что у боевых вкладок.
     */
    protected readonly tabs = ['market.marketPage.tabPrivileges', 'market.marketPage.tabKits', 'market.marketPage.tabSpecial'];

    /**
     * Индекс открытой вкладки. Начало берётся из `?tab=`, как у боевых вкладок.
     */
    protected readonly active = signal(
        Math.max(
            0,
            ['titles', 'kits', 'special'].indexOf(
                inject(ActivatedRoute).snapshot.queryParamMap.get('tab') ?? 'titles',
            ),
        ),
    );

    /**
     * Индекс панели, доезжающей уход, или null, когда уходящих нет.
     */
    protected readonly leaving = signal<number | null>(null);

    /**
     * Направление перехода: 1 — вправо по списку вкладок, -1 — влево.
     */
    protected readonly direction = signal(1);

    /**
     * Положение и ширина плашки-индикатора, px (вариант A).
     */
    protected readonly pill = signal({ x: 0, w: 0 });

    /**
     * Кнопки вкладок в порядке `tabs` — для замера плашки.
     */
    private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

    /**
     * Ставит плашку на активную вкладку после первой отрисовки.
     */
    private readonly placePillAfterRender = afterNextRender(() => this.placePill());

    /**
     * Открывает вкладку: направление для B, уходящая панель для B и C.
     *
     * @param index Индекс вкладки в `tabs`.
     */
    protected select(index: number): void {
        if (index === this.active()) {
            return;
        }

        const previous = this.active();

        this.direction.set(index > previous ? 1 : -1);
        this.leaving.set(null);
        this.active.set(index);
        this.placePill();

        // Уходящая панель нужна только там, где её видно: в A и D контент
        // сменяется одним входом, и висящий поверх дубль был бы артефактом.
        if (this.variant() === 'B' || this.variant() === 'C') {
            this.leaving.set(previous);
        }
    }

    /**
     * Снимает уходящую панель, когда её анимация доиграла.
     */
    protected onLeaveEnd(): void {
        this.leaving.set(null);
    }

    /**
     * Читает позицию активной кнопки и ставит плашку на неё.
     */
    private placePill(): void {
        const button = this.tabButtons()[this.active()];

        if (!button) {
            return;
        }

        this.pill.set({ x: button.nativeElement.offsetLeft, w: button.nativeElement.offsetWidth });
    }
}
