/**
 * Вариант шапки «Две палубы».
 *
 * Одна карточка из двух ярусов-палуб:
 * - верхняя палуба — тонкая тёмная приборная строка телеметрии: онлайн
 *   с радарным бликом на точке жизни, линия занятости, игровое время и имя
 *   текущего раздела; тёмная в обеих темах (токены `--lh-night*` и
 *   `--lh-parchment*` от темы не зависят);
 * - нижняя палуба — светлая: знак проекта слева, навигация в центре и
 *   управление справа (тема, язык, колокольчик, карточка игрока или вход).
 *
 * В навигации одна скользящая янтарная пилюля-индикатор: стоит под активным
 * разделом, на ховере и на фокусе уходит под наведённый пункт и возвращается.
 * Пилюля измеряется от контейнера навигации (`getBoundingClientRect`),
 * двигается через `transform`, ширину получает CSS-переменной; перемер — на
 * маршрут, язык, состояние входа, наведение и размер контейнера
 * (`ResizeObserver`).
 *
 * «Сообщество» открывает манифест разделов на всю ширину колонки, на узких
 * экранах (<1024px) вся навигация уходит за одну кнопку-меню со своей
 * шторкой. Шторки закрываются по клику мимо, Escape и переходу.
 *
 * Единственный циклический эффект — радарный блик на точке жизни сервера
 * (3s). При `prefers-reduced-motion` движение стоит в видимом состоянии,
 * ничего не спрятано. Данные — из {@link HeaderState}. Шапка не липкая.
 */
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    PLATFORM_ID,
    computed,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { AmountPipe, TranslatePipe } from '@core/i18n';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { PlayerAvatarComponent } from '@entities/player-style';
import { NotificationBellComponent } from '@features/notifications';
import { HeaderState } from '../../../header-state.service';

/**
 * Имя текущего раздела для приборной строки: иконка и ключ подписи.
 */
interface DeckSection {
    /**
     * Иконка Taiga UI.
     */
    icon: string;

    /**
     * Ключ перевода подписи.
     */
    labelKey: string;
}

@Component({
    standalone: true,
    selector: 'app-header-deck',
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
    templateUrl: './deck.component.html',
    styleUrl: './deck.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckComponent implements AfterViewInit, OnDestroy {
    /**
     * Данные шапки: телеметрия, блок игрока, списки меню. Сервис объявлен
     * в провайдерах хоста прототипа, поэтому экземпляр один на вариант.
     */
    protected readonly state = inject(HeaderState);

    /**
     * Раскрыт ли манифест «Сообщества» (десктопная мега-панель).
     */
    protected readonly sheetOpen = signal(false);

    /**
     * Раскрыта ли шторка мобильного меню (вся навигация одной кнопкой).
     */
    protected readonly menuOpen = signal(false);

    /**
     * Ключ пункта под указателем или в фокусе (`null` — пилюля у активного раздела).
     */
    protected readonly hovered = signal<string | null>(null);

    /**
     * Сдвиг пилюли от левого края контейнера навигации, px.
     */
    protected readonly pillX = signal(0);

    /**
     * Ширина пилюли, px.
     */
    protected readonly pillW = signal(0);

    /**
     * Пилюля измерена: до первого удачного замера она невидима,
     * иначе вспыхивала бы в левом углу навигации.
     */
    protected readonly pillOn = signal(false);

    /**
     * Контейнер десктопной навигации, от которого меряется пилюля.
     */
    private readonly navList = viewChild<ElementRef<HTMLElement>>('navList');

    /**
     * Хост-элемент варианта — чтобы отличать клик внутри шапки от клика мимо.
     * Тип задан аннотацией: `inject(ElementRef<…>)` инстанцирующим выражением
     * компилятор Angular в dev-сборке разворачивает в `ElementRef<any>`.
     */
    private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

    /**
     * Сервис навигации: переход закрывает шторки и двигает пилюлю.
     */
    private readonly router = inject(Router);

    /**
     * Идентификатор платформы: измерение и `ResizeObserver` есть только в браузере.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Документ: шрифты меняют ширину подписей после первой раскладки.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Наблюдатель за размером контейнера навигации.
     */
    private resizeObserver: ResizeObserver | null = null;

    /**
     * Текущий адрес после редиректов.
     */
    private readonly url = signal(this.router.url);

    /**
     * Путь без query-строки: с ним сравниваются маршруты меню.
     */
    private readonly path = computed(() => this.url().split('?')[0]);

    /**
     * Ключ активного пункта навигации: `home`, маршрут пункта меню, `community`
     * или `null`, когда раздел не входит в меню (профиль, страница новости).
     */
    protected readonly activeKey = computed<string | null>(() => {
        const path = this.path();

        if (path === '/' || path === '') {
            return 'home';
        }

        if (this.state.communityActive()) {
            return 'community';
        }

        const link = this.state.mainLinks.find((item) => path.startsWith(item.route));

        return link ? link.route : null;
    });

    /**
     * Раздел для приборной строки (`null` — маршрут неизвестен, строка молчит).
     */
    protected readonly currentSection = computed<DeckSection | null>(() => {
        const path = this.path();

        if (path === '/' || path === '') {
            return { icon: '@tui.house', labelKey: 'header.nav.home' };
        }

        if (path.startsWith('/profile')) {
            return { icon: '@tui.user', labelKey: 'header.nav.profile' };
        }

        const link = [...this.state.communityLinks, ...this.state.mainLinks].find((item) =>
            path.startsWith(item.route)
        );

        return link ? { icon: link.icon, labelKey: link.labelKey } : null;
    });

    /**
     * Пункт, под которым сейчас стоит пилюля: наведённый, открытое «Сообщество»
     * или активный раздел.
     */
    protected readonly pillTarget = computed<string | null>(
        () => this.hovered() ?? (this.sheetOpen() ? 'community' : this.activeKey())
    );

    /**
     * Пилюля стоит на активном разделе, а не под наведённым пунктом:
     * янтарное жало пилюли в покое длиннее и плотнее.
     */
    protected readonly pillResting = computed(
        () => this.pillTarget() !== null && this.hovered() === null && !this.sheetOpen()
    );

    /**
     * Подписывается на завершение навигации: шторки не остаются открытыми
     * на новой странице, а пилюля и имя раздела следуют за адресом.
     */
    public constructor() {
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntilDestroyed()
            )
            .subscribe((event) => {
                this.url.set(event.urlAfterRedirects);
                this.closeAll();
            });

        // Перемер после каждой смены того, что двигает раскладку навигации:
        // маршрут, язык, состояние входа (гостевой пункт), наведение, шторка.
        effect(() => {
            this.pillTarget();
            this.state.language();
            this.state.isAuth();
            this.scheduleMeasure();
        });
    }

    /**
     * Первый замер, наблюдение за размером навигации и перемер после загрузки шрифтов.
     */
    public ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const list = this.navList()?.nativeElement;

        if (list && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.measure());
            this.resizeObserver.observe(list);
        }

        this.scheduleMeasure();

        // Шрифты меняют ширину подписей уже после первой раскладки.
        void this.document.fonts?.ready.then(() => this.measure());
    }

    /**
     * Снимает наблюдение за размером навигации.
     */
    public ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
    }

    /**
     * Переключает манифест «Сообщества»; мобильную шторку при этом прячет.
     */
    protected toggleSheet(): void {
        this.menuOpen.set(false);
        this.sheetOpen.update((open) => !open);
    }

    /**
     * Переключает шторку мобильного меню; манифест при этом прячет.
     */
    protected toggleMenu(): void {
        this.sheetOpen.set(false);
        this.menuOpen.update((open) => !open);
    }

    /**
     * Закрывает обе шторки (переход, клик мимо, Escape, клик по ячейке).
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
     * Переводит пилюлю под пункт, на который наведён указатель.
     *
     * @param key Ключ пункта (`home`, маршрут, `community`).
     */
    protected onItemEnter(key: string): void {
        this.hovered.set(key);
    }

    /**
     * Возвращает пилюлю активному разделу, когда указатель уходит с навигации.
     */
    protected onListLeave(): void {
        this.hovered.set(null);
    }

    /**
     * Ведёт пилюлю за фокусом клавиатуры так же, как за указателем.
     *
     * @param event Событие фокуса внутри списка навигации.
     */
    protected onListFocusIn(event: FocusEvent): void {
        const item = (event.target as HTMLElement | null)?.closest('[data-pill-key]');

        if (item instanceof HTMLElement) {
            this.hovered.set(item.dataset['pillKey'] ?? null);
        }
    }

    /**
     * Возвращает пилюлю активному разделу, когда фокус уходит из списка навигации.
     *
     * @param event Событие потери фокуса внутри списка навигации.
     */
    protected onListFocusOut(event: FocusEvent): void {
        const list = this.navList()?.nativeElement;
        const next = event.relatedTarget as Node | null;

        if (list && next && list.contains(next)) {
            return;
        }

        this.hovered.set(null);
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
     * Распространение события останавливается: пилюля прототипа тоже слушает
     * `Esc` и возвращает боевую шапку, а первый нажатый `Esc` обязан закрыть
     * шторку, а не весь прототип.
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

    /**
     * Откладывает перемер на макрозадачу: шаблон обновляется после смены
     * сигналов, и мерить нужно уже новую раскладку.
     */
    private scheduleMeasure(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        setTimeout(() => this.measure());
    }

    /**
     * Измеряет целевой пункт относительно контейнера навигации и записывает
     * геометрию в сигналы пилюли. Без цели (пункт скрыт, навигация сложена
     * в меню) пилюля прячется.
     */
    private measure(): void {
        const list = this.navList()?.nativeElement;
        const key = this.pillTarget();

        if (!list || !key) {
            this.pillOn.set(false);

            return;
        }

        const item = list.querySelector<HTMLElement>(`[data-pill-key="${key}"]`);

        if (!item) {
            this.pillOn.set(false);

            return;
        }

        const listRect = list.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        if (listRect.width === 0 || itemRect.width === 0) {
            this.pillOn.set(false);

            return;
        }

        this.pillX.set(Math.round(itemRect.left - listRect.left));
        this.pillW.set(Math.round(itemRect.width));
        this.pillOn.set(true);
    }
}
