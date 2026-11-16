/**
 * Шапка «Корона»: композиция боевой шапки «Очаг и корона».
 *
 * Центростремительная композиция на ночном фоне страницы: ярус 1 — тонкая
 * строка телеметрии и управления (счётчик онлайна с
 * линией занятости и игровым временем слева; тема, язык, колокольчик и
 * карточка игрока либо вход справа), ярус 2 — крупный вензель сервера
 * в `.lh-display`: эмблема и название одной колонкой, за знаком — янтарное
 * сияние, ярус 3 — один центрированный ряд ссылок капителью со скользящим
 * янтарным подчёркиванием. «Сообщество» раскрывает мега-панель на всю
 * ширину колонки шторкой с каскадом плиток; ниже 768px вся навигация уходит
 * за одну кнопку-меню со своей шторкой.
 *
 * Единственный циклический эффект — дыхание сияния, 3.2s на оборот
 * (предел 2.5–4s); остальное движение — переходы состояний. При
 * `prefers-reduced-motion` дыхание стоит в видимом состоянии, шторки
 * открываются мгновенно, ничего не спрятано.
 *
 * Данные — из {@link HeaderState}: без ответа сервера телеметрия показывает
 * прочерк, зоны размера не меняют. Шапка не липкая: `position: relative`,
 * как у боевой шапки.
 */
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { AmountPipe, TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { PlayerAvatarComponent } from '@entities/player-style';
import { NotificationBellComponent } from '@features/notifications';
import { HeaderState } from '../header-state.service';

@Component({
    standalone: true,
    selector: 'app-header-crown',
    imports: [
        AmountPipe,
        RouterLink,
        RouterLinkActive,
        TuiIcon,
        TranslatePipe,
        ImageLoaderComponent,
        NotificationBellComponent,
        PlayerAvatarComponent,
    ],
    templateUrl: './crown.component.html',
    styleUrl: './crown.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrownComponent implements AfterViewInit, OnDestroy {
    /**
     * Данные шапки: телеметрия, блок игрока, списки меню. Сервис объявлен
     * в провайдерах хоста `app-header`, поэтому экземпляр один на шапку.
     */
    protected readonly state = inject(HeaderState);

    /**
     * Скользящее подчёркивание ряда ссылок: left, top и width в пикселях от
     * краёв ряда. Top нужен перенесённому ряду: полоса встаёт под свою
     * строку. `null` — подходящей ссылки нет, полоса скрыта.
     */
    protected readonly slide = signal<{ left: number; top: number; width: number } | null>(null);

    /**
     * Ряд ссылок яруса 3: от его краёв отсчитываются координаты подчёркивания.
     */
    private readonly row = viewChild<ElementRef<HTMLDivElement>>('row');

    /**
     * Ссылка под курсором или фокусом: пока она есть, подчёркивание следует
     * за ней, а не за активным разделом.
     */
    private hovered: HTMLElement | null = null;

    /**
     * Следит за размером ряда: перенос ссылок и загрузка шрифтов меняют
     * ширину, и подчёркивание переезжает без участия пользователя.
     */
    private rowResize: ResizeObserver | null = null;

    /**
     * Раскрыта ли мега-панель «Сообщества» (десктопный ряд ссылок).
     */
    protected readonly sheetOpen = signal(false);

    /**
     * Раскрыта ли шторка мобильного меню (вся навигация одной кнопкой).
     */
    protected readonly menuOpen = signal(false);

    /**
     * Хост-элемент шапки — чтобы отличать клик внутри шапки от клика мимо.
     * Тип задан аннотацией: `inject(ElementRef<…>)` инстанцирующим выражением
     * компилятор Angular в dev-сборке разворачивает в `ElementRef<any>`.
     */
    private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

    /**
     * Сервис навигации: переход закрывает открытые шторки.
     */
    private readonly router = inject(Router);

    /**
     * Подписывается на завершение навигации, чтобы шторки не оставались
     * открытыми на новой странице.
     */
    public constructor() {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe(() => {
                this.closeAll();
                requestAnimationFrame(() => this.placeCurrent());
            });
    }

    /**
     * Ставит подчёркивание на активную ссылку и включает слежение за размером
     * ряда и за готовностью шрифтов.
     */
    public ngAfterViewInit(): void {
        this.placeCurrent();

        const row = this.row()?.nativeElement;

        /* ResizeObserver и шрифты есть не в каждой среде: в тестах без них
           подчёркивание просто ставится один раз после рендера. */
        if (row && typeof ResizeObserver === 'function') {
            this.rowResize = new ResizeObserver(() => this.placeCurrent());
            this.rowResize.observe(row);
        }

        const fonts = document.fonts as FontFaceSet | undefined;

        if (fonts) {
            void fonts.ready.then(() => this.placeCurrent());
        }
    }

    /**
     * Отключает слежение за размером ряда.
     */
    public ngOnDestroy(): void {
        this.rowResize?.disconnect();
        this.rowResize = null;
    }

    /**
     * Переключает мега-панель «Сообщества»; мобильную шторку при этом прячет.
     */
    protected toggleSheet(): void {
        this.menuOpen.set(false);
        this.sheetOpen.update((open) => !open);
    }

    /**
     * Переключает шторку мобильного меню; мега-панель при этом прячет.
     */
    protected toggleMenu(): void {
        this.sheetOpen.set(false);
        this.menuOpen.update((open) => !open);
    }

    /**
     * Закрывает обе шторки (переход, клик мимо, Escape, клик по плитке).
     */
    protected closeAll(): void {
        this.sheetOpen.set(false);
        this.menuOpen.set(false);
    }

    /**
     * Меняет язык интерфейса на противоположный текущему.
     */
    protected toggleLanguage(): void {
        this.state.selectLanguage(this.state.language() === 'ru' ? 'en' : 'ru');
    }

    /**
     * Ведёт скользящее подчёркивание к ссылке под курсором или фокусом.
     *
     * @param event Событие курсора или фокуса внутри ряда ссылок.
     */
    protected slideTo(event: Event): void {
        const link = (event.target as HTMLElement).closest<HTMLElement>('.crown__link');

        if (!link || link === this.hovered) {
            return;
        }

        this.hovered = link;
        this.slide.set(this.measure(link));
    }

    /**
     * Возвращает подчёркивание на активный раздел, когда курсор ушёл из ряда.
     */
    protected slideHome(): void {
        this.hovered = null;
        this.placeCurrent();
    }

    /**
     * Ставит подчёркивание на ссылку под курсором, а без неё — на активную.
     * Без активной ссылки сигнал сбрасывается в `null`, и полоса гаснет.
     */
    private placeCurrent(): void {
        if (this.hovered) {
            this.slide.set(this.measure(this.hovered));

            return;
        }

        const active = this.row()?.nativeElement.querySelector<HTMLElement>('.crown__link--active') ?? null;

        this.slide.set(active ? this.measure(active) : null);
    }

    /**
     * Меряет ссылку от краёв ряда: top полосы равен низу ссылки минус 8px,
     * поэтому на перенесённом ряду она встаёт под свою строку.
     *
     * @param link Ссылка ряда ссылок яруса 3.
     * @returns Координаты полосы в пикселях относительно ряда.
     */
    private measure(link: HTMLElement): { left: number; top: number; width: number } {
        return {
            left: link.offsetLeft,
            top: link.offsetTop + link.offsetHeight - 8,
            width: link.offsetWidth,
        };
    }

    /**
     * Клик мимо шапки закрывает открытые шторки.
     *
     * @param event Событие клика по документу.
     */
    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if ((this.sheetOpen() || this.menuOpen()) && !this.host.nativeElement.contains(event.target as Node)) {
            this.closeAll();
        }
    }

    /**
     * Escape закрывает шторки и возвращает фокус на кнопку, которая их открыла.
     *
     * Распространение события останавливается: первый нажатый `Esc` обязан
     * закрыть шторку, а не уйти дальше по документу.
     *
     * @param event Событие клавиатуры.
     */
    @HostListener('document:keydown.escape', ['$event'])
    protected onEscape(event: KeyboardEvent): void {
        if (!this.sheetOpen() && !this.menuOpen()) {
            return;
        }

        event.stopPropagation();

        const trigger = this.host.nativeElement.querySelector<HTMLElement>('[aria-expanded="true"]');

        this.closeAll();
        trigger?.focus();
    }
}
