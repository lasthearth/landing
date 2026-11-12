/**
 * Вариант шапки «Угольный рельс».
 *
 * Одна пластина в один ряд: знак проекта, ряд разделов, показания сервера и
 * управление. Вдоль нижнего края пластины лежит угольный рельс — дорожка,
 * заполненная ровно на долю занятых мест, а на её живом конце дышит янтарная
 * отметка: это единственный постоянный эффект варианта, цикл 3.2s.
 *
 * Активный раздел — не подчёркивание, а тёмный вагон-плашка: на светлой
 * пластине он чернильный, на тёмной — пергаментный, поэтому состояние читается
 * в обеих темах одним правилом.
 *
 * «Сообщество» раскрывает индекс разделов шторкой во всю ширину колонки;
 * ниже 1320px вся навигация уходит за одну кнопку-меню со своей шторкой.
 * Закрытие — по переходу, клику мимо и Escape.
 *
 * Шапка не липкая (`position: relative`): прокрутка на её вид не влияет.
 * Данные — только из {@link HeaderState}. При `prefers-reduced-motion` отметка
 * стоит в видимом состоянии, шторки открываются без движения, ничего не спрятано.
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
    selector: 'app-header-rail',
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
    templateUrl: './rail.component.html',
    styleUrl: './rail.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RailComponent {
    /**
     * Данные шапки: телеметрия, блок игрока, списки меню. Сервис объявлен в
     * провайдерах хоста прототипа, поэтому экземпляр один на вариант.
     */
    protected readonly state = inject(HeaderState);

    /**
     * Раскрыт ли индекс «Сообщества» (десктопный ряд ссылок).
     */
    protected readonly sheetOpen = signal(false);

    /**
     * Раскрыта ли шторка меню (экраны уже 1320px, где ряд ссылок не влезает).
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
     * Переключает индекс «Сообщества»; шторку меню при этом прячет.
     */
    protected toggleSheet(): void {
        this.menuOpen.set(false);
        this.sheetOpen.update((open) => !open);
    }

    /**
     * Переключает шторку меню; индекс «Сообщества» при этом прячет.
     */
    protected toggleMenu(): void {
        this.sheetOpen.set(false);
        this.menuOpen.update((open) => !open);
    }

    /**
     * Закрывает обе шторки: переход, клик мимо, Escape, клик по разделу.
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
