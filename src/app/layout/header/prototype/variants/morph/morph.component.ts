/**
 * Вариант шапки «Живая капсула».
 *
 * Шапка — светлая капсула-стадион, плавающая над тёмным фоном страницы:
 * знак проекта в круглом медальоне, телеметрия и управление в одном ряду,
 * ниже — навигация на утопленной пилюле-дорожке. Капсула «дышит»: мягкий
 * янтарный ореол под пластиной медленно набирает и гасит яркость
 * (цикл 3.2s) — это единственный фоновый эффект движения; при
 * `prefers-reduced-motion` ореол стоит в видимом состоянии, ничего не спрятано.
 *
 * Мега-панель «Сообщества» и мобильная шторка раскрываются строкой грида
 * ниже капсулы отдельными отсеками: сама капсула высоту не меняет.
 * Закрытие — клик мимо, Escape (с возвратом фокуса на триггер) и переход.
 *
 * Состав данных повторяет боевую шапку: знак и название проекта, онлайн
 * с линией занятости и игровым временем, тема, язык, колокольчик, карточка
 * игрока или вход, основное меню и мега-панель «Сообщества», на узких
 * экранах — одна кнопка-меню. Данные — из {@link HeaderState}.
 * Шапка не липкая: боевая шапка тоже не липкая (`position: relative`).
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
import { HeaderState } from '../../../header-state.service';

@Component({
    standalone: true,
    selector: 'app-header-morph',
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
    templateUrl: './morph.component.html',
    styleUrl: './morph.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MorphComponent {
    /**
     * Данные шапки: телеметрия, блок игрока, списки меню. Сервис объявлен
     * в провайдерах хоста прототипа, поэтому экземпляр один на вариант.
     */
    protected readonly state = inject(HeaderState);

    /**
     * Раскрыта ли мега-панель «Сообщества» (десктопный ряд ссылок).
     */
    protected readonly sheetOpen = signal(false);

    /**
     * Раскрыта ли шторка мобильного меню (вся навигация за одной кнопкой).
     */
    protected readonly menuOpen = signal(false);

    /**
     * Хост-элемент варианта — чтобы отличать клик внутри шапки от клика мимо.
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
}
