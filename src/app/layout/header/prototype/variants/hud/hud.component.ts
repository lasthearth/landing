/**
 * Вариант шапки «Военный стол».
 *
 * Шапка — угловатая боевая пластина: срезанные углы и кромка нарисованы
 * отдельным слоем с `clip-path`, по углам стоят скобки, по пластине раз в 3s
 * проходит блик. Разделы меню — ячейки с двузначными номерами через
 * CSS-счётчик; занятость сервера — сегментная шкала из 40 тиков, которая
 * зажигается каскадом один раз, когда пришли данные; карточка игрока —
 * отдельный «патрон» со скосом.
 *
 * Пластина держит свои цвета: одинакова в обеих темах страницы, в тёмной
 * теме приглушается только внешняя кромка (`:host-context` в LESS). Текст —
 * пергаментные токены, янтарь — `--lh-accent`, размеры и движение — токены
 * `--lh-*`. При `prefers-reduced-motion` блик снят, тики и шторки остаются
 * в видимом состоянии, ничего не спрятано.
 *
 * Состав данных повторяет боевую шапку: знак и название проекта, онлайн
 * со шкалой занятости и игровым временем, тема, язык, колокольчик, карточка
 * игрока или вход, основное меню и дропдаун «Сообщества», на узких экранах —
 * одна кнопка-меню со шторкой. Данные — из {@link HeaderState}. Шапка не
 * липкая: боевая шапка тоже не липкая (`position: relative`).
 */
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
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
    selector: 'app-header-hud',
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
    templateUrl: './hud.component.html',
    styleUrl: './hud.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudComponent {
    /**
     * Данные шапки: телеметрия, блок игрока, списки меню. Сервис объявлен
     * в провайдерах хоста прототипа, поэтому экземпляр один на вариант.
     */
    protected readonly state = inject(HeaderState);

    /**
     * Индексы тиков шкалы занятости (0…39) — стабильный массив для `@for`.
     */
    protected readonly ticks: readonly number[] = Array.from({ length: 40 }, (_, index) => index);

    /**
     * Число зажжённых тиков: доля занятости, округлённая до сегмента.
     */
    protected readonly litTicks = computed(() => Math.round(this.state.occupancy() * this.ticks.length));

    /**
     * Основные разделы меню без пунктов «только для гостей» у авторизованных.
     */
    protected readonly visibleMainLinks = computed(() =>
        this.state.mainLinks.filter((link) => !link.guestOnly || !this.state.isAuth())
    );

    /**
     * Раскрыт ли дропдаун «Сообщества» (десктопные ячейки).
     */
    protected readonly sheetOpen = signal(false);

    /**
     * Раскрыта ли шторка мобильного меню (вся навигация одной кнопкой).
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
     * Переключает дропдаун «Сообщества»; мобильную шторку при этом прячет.
     */
    protected toggleSheet(): void {
        this.menuOpen.set(false);
        this.sheetOpen.update((open) => !open);
    }

    /**
     * Переключает шторку мобильного меню; дропдаун «Сообщества» при этом прячет.
     */
    protected toggleMenu(): void {
        this.sheetOpen.set(false);
        this.menuOpen.update((open) => !open);
    }

    /**
     * Закрывает обе шторки (переход, клик мимо, Escape, клик по ссылке).
     */
    protected closeAll(): void {
        this.sheetOpen.set(false);
        this.menuOpen.set(false);
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
