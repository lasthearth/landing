/**
 * Шапка «Корона»: композиция боевой шапки «Очаг и корона».
 *
 * Центростремительная композиция на ночном фоне страницы: ярус 1 — тонкая
 * строка телеметрии и управления (счётчик онлайна с
 * линией занятости и игровым временем слева; тема, язык, колокольчик и
 * карточка игрока либо вход справа), ярус 2 — крупный вензель сервера
 * в `.lh-display` между волосяными линейками до краёв колонки, за знаком —
 * янтарное сияние, ярус 3 — один центрированный ряд ссылок капителью
 * с янтарным подчёркиванием. «Сообщество» раскрывает мега-панель на всю
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
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
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
export class CrownComponent {
    /**
     * Данные шапки: телеметрия, блок игрока, списки меню. Сервис объявлен
     * в провайдерах хоста `app-header`, поэтому экземпляр один на шапку.
     */
    protected readonly state = inject(HeaderState);

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
            .subscribe(() => this.closeAll());
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
