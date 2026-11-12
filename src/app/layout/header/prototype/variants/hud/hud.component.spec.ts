/**
 * Тесты варианта шапки «Военный стол».
 *
 * `HeaderState` тянет десяток боевых сервисов, поэтому сервис подменён
 * сигнальной заглушкой, а тяжёлые компоненты (аватар, колокольчик, иконки,
 * загрузчик картинок) и пайпы — пустыми standalone-заглушками. Проверяется
 * то, что вариант рисует сам: состав блока игрока, шкалу занятости и шторки.
 */
import { Component, Pipe, PipeTransform, computed, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderState } from '../../../header-state.service';
import { OnlineCount } from '../../../lib/occupancy-share.function';
import { HudComponent } from './hud.component';

/** Заглушка иконки Taiga. */
@Component({ standalone: true, selector: 'tui-icon', template: '' })
class TuiIconStubComponent {
    public readonly icon = input('');
}

/** Заглушка загрузчика картинки. */
@Component({ standalone: true, selector: 'app-image-loader', template: '' })
class ImageLoaderStubComponent {
    public readonly src = input('');
    public readonly alt = input('');
}

/** Заглушка аватара игрока. */
@Component({ standalone: true, selector: 'app-player-avatar', template: '<div data-stub="avatar"></div>' })
class PlayerAvatarStubComponent {
    public readonly userId = input<string | null | undefined>(null);
    public readonly src = input('');
    public readonly alt = input('');
    public readonly animated = input(true);
}

/** Заглушка колокольчика уведомлений. */
@Component({ standalone: true, selector: 'app-notification-bell', template: '<div data-stub="bell"></div>' })
class NotificationBellStubComponent {}

/** Перевод-заглушка: возвращает ключ как есть. */
@Pipe({ name: 'translate', standalone: true })
class TranslatePipeStub implements PipeTransform {
    public transform(key: string | null | undefined): string {
        return key ?? '';
    }
}

/** Сумма-заглушка: возвращает строку как есть. */
@Pipe({ name: 'amount', standalone: true })
class AmountPipeStub implements PipeTransform {
    public transform(value: string | null): string {
        return value ?? '—';
    }
}

describe('HudComponent', () => {
    let fixture: ComponentFixture<HudComponent>;
    let root: HTMLElement;

    /** Данные онлайна: ими управляется шкала занятости. */
    const online = signal<OnlineCount | null>({ online: 50, max_online: 100 });

    /** Признак входа: переключается между гостевым и авторизованным видом. */
    const isAuth = signal(false);

    /** Имя игрока. */
    const userName = signal('Огнеяр');

    /**
     * Сигнальная заглушка `HeaderState`: только те поля, которые читает
     * шаблон варианта.
     */
    const fakeState = {
        online,
        time: signal<string | null>('7:12'),
        occupancy: computed(() => {
            const data = online();

            return data ? data.online / data.max_online : 0;
        }),
        isAuth,
        userName,
        userImage: signal(''),
        userId: signal<string | null>(null),
        coins: signal<string | null>('1240'),
        attention: signal(false),
        dark: signal(false),
        language: signal<'ru' | 'en'>('ru'),
        mainLinks: [
            { route: '/rules', icon: '@tui.file-text', labelKey: 'header.nav.rules' },
            { route: '/start-game', icon: '@tui.gamepad-2', labelKey: 'header.nav.startGame', guestOnly: true },
        ],
        communityLinks: [{ route: '/map', icon: '@tui.map', labelKey: 'header.nav.map' }],
        communityActive: signal(false),
        communityFresh: signal(false),
        isFresh: () => false,
        toggleTheme: () => {},
        selectLanguage: () => {},
        signIn: () => {},
        signOut: () => {},
    };

    /**
     * Рисует вариант и возвращает корень его разметки.
     */
    const render = (): void => {
        fixture.detectChanges();
        root = fixture.nativeElement as HTMLElement;
    };

    beforeEach(async () => {
        online.set({ online: 50, max_online: 100 });
        isAuth.set(false);
        userName.set('Огнеяр');

        TestBed.overrideComponent(HudComponent, {
            set: {
                imports: [
                    RouterLink,
                    RouterLinkActive,
                    TuiIconStubComponent,
                    ImageLoaderStubComponent,
                    PlayerAvatarStubComponent,
                    NotificationBellStubComponent,
                    TranslatePipeStub,
                    AmountPipeStub,
                ],
            },
        });
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: HeaderState, useValue: fakeState }],
        });

        fixture = TestBed.createComponent(HudComponent);
        render();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('гостю показывает вход и прячет «патрон» игрока', () => {
        expect(root.querySelector('.hud__signin')).not.toBeNull();
        expect(root.querySelector('.hud__cart')).toBeNull();
        expect(root.querySelector('[data-stub="bell"]')).toBeNull();
    });

    it('игроку показывает имя, баланс, колокольчик и выход', () => {
        isAuth.set(true);
        render();

        expect(root.querySelector('.hud__signin')).toBeNull();
        expect(root.querySelector('.hud__cart')).not.toBeNull();
        expect(root.querySelector('[data-stub="bell"]')).not.toBeNull();
        expect(root.querySelector('.hud__cart-name')?.textContent?.trim()).toBe('Огнеяр');
        expect(root.querySelector('.hud__coins')?.textContent).toContain('1240');
        expect(root.querySelector('.hud__exit')).not.toBeNull();
    });

    it('рисует 40 тиков шкалы и зажигает половину при занятости 50%', () => {
        const ticks = root.querySelectorAll('.hud__tick');

        expect(ticks.length).toBe(40);
        expect(root.querySelectorAll('.hud__tick--lit').length).toBe(20);
    });

    it('без ответа сервера показывает прочерк и не зажигает тики', () => {
        online.set(null);
        render();

        expect(root.querySelector('.hud__count-now')?.textContent?.trim()).toBe('—');
        expect(root.querySelectorAll('.hud__tick--lit').length).toBe(0);
    });

    it('кнопка меню раскрывает шторку, Escape закрывает её', () => {
        const menu = root.querySelector<HTMLButtonElement>('.hud__menu') as HTMLButtonElement;
        const sheet = (): HTMLElement => root.querySelector('.hud__sheet') as HTMLElement;

        menu.click();
        render();

        expect(menu.getAttribute('aria-expanded')).toBe('true');
        expect(sheet().classList.contains('hud__sheet--open')).toBe(true);
        expect(sheet().hasAttribute('inert')).toBe(false);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        render();

        expect(menu.getAttribute('aria-expanded')).toBe('false');
        expect(sheet().classList.contains('hud__sheet--open')).toBe(false);
        expect(sheet().hasAttribute('inert')).toBe(true);
    });

    it('ячейка «Сообщества» раскрывает и закрывает дропдаун', () => {
        const trigger = root.querySelector<HTMLButtonElement>('.hud__cell--trigger') as HTMLButtonElement;
        const drop = (): HTMLElement => root.querySelector('.hud__drop') as HTMLElement;

        trigger.click();
        render();

        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(drop().classList.contains('hud__drop--open')).toBe(true);

        trigger.click();
        render();

        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(drop().classList.contains('hud__drop--open')).toBe(false);
    });

    it('клик по ссылке в шторке закрывает её', () => {
        const menu = root.querySelector<HTMLButtonElement>('.hud__menu') as HTMLButtonElement;

        menu.click();
        render();

        (root.querySelector('.hud__row') as HTMLElement).click();
        render();

        expect(root.querySelector('.hud__sheet')?.classList.contains('hud__sheet--open')).toBe(false);
    });
});
