/**
 * Тесты варианта шапки «Врата очага».
 *
 * `HeaderState` тянет боевые сервисы, поэтому сервис подменён сигнальной
 * заглушкой, а тяжёлые компоненты (аватар, колокольчик, иконки, загрузчик
 * картинок) и пайпы — пустыми standalone-заглушками. Проверяется то, что
 * вариант рисует сам: счётчик онлайна, блок игрока, ряд навигации и шторки.
 */
import { Component, Pipe, PipeTransform, computed, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { provideRouter, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderState } from '../../../header-state.service';
import { OnlineCount } from '../../../lib/occupancy-share.function';
import { HearthGateComponent } from './hearth-gate.component';

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

describe('HearthGateComponent (шапка)', () => {
    let fixture: ComponentFixture<HearthGateComponent>;
    let root: HTMLElement;

    /** Данные онлайна: ими управляются счётчик и шкала занятости. */
    const online = signal<OnlineCount | null>({ online: 50, max_online: 100 });

    /** Признак входа: переключается между гостевым и авторизованным видом. */
    const isAuth = signal(false);

    /** Имя игрока. */
    const userName = signal('Огнеяр');

    /** Язык интерфейса. */
    const language = signal<'ru' | 'en'>('ru');

    /** Свидетель переключения языка: кнопка обязана позвать выбор языка. */
    const selectLanguage = vi.fn();

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
        language,
        mainLinks: [
            { route: '/rules', icon: '@tui.file-text', labelKey: 'header.nav.rules' },
            { route: '/start-game', icon: '@tui.gamepad-2', labelKey: 'header.nav.startGame', guestOnly: true },
        ],
        communityLinks: [{ route: '/map', icon: '@tui.map', labelKey: 'header.nav.map' }],
        communityActive: signal(false),
        communityFresh: signal(false),
        isFresh: () => false,
        toggleTheme: () => {},
        selectLanguage,
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
        language.set('ru');

        TestBed.overrideComponent(HearthGateComponent, {
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

        fixture = TestBed.createComponent(HearthGateComponent);
        render();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует знак, счётчик онлайна и ряд навигации по данным состояния', () => {
        expect(root.querySelector('.gate__brand')).not.toBeNull();
        expect(root.querySelector('.gate__count-now')?.textContent?.trim()).toBe('50');
        expect(root.querySelector('.gate__count-max')?.textContent).toContain('100');
        expect(root.querySelectorAll('.gate__nav a').length).toBeGreaterThan(0);
    });

    it('без ответа сервера показывает прочерки вместо чисел', () => {
        online.set(null);
        render();

        expect(root.querySelector('.gate__count-now')?.textContent?.trim()).toBe('—');
        expect(root.querySelector('.gate__count-max')?.textContent).toContain('—');
    });

    it('гостю показывает вход и не рисует блок игрока', () => {
        expect(root.querySelector('.gate__signin')).not.toBeNull();
        expect(root.querySelector('.gate__player')).toBeNull();
        expect(root.querySelector('[data-stub="bell"]')).toBeNull();
    });

    it('игроку показывает имя, баланс, колокольчик и выход', () => {
        isAuth.set(true);
        render();

        expect(root.querySelector('.gate__signin')).toBeNull();
        expect(root.querySelector('.gate__player')).not.toBeNull();
        expect(root.querySelector('[data-stub="bell"]')).not.toBeNull();
        expect(root.querySelector('.gate__player-name')?.textContent?.trim()).toBe('Огнеяр');
        expect(root.querySelector('.gate__coins')?.textContent).toContain('1240');
    });

    it('открывает шторку сообщества кнопкой и закрывает её Escape', () => {
        const sheet = (): Element | null => root.querySelector('.gate__sheet:not(.gate__sheet--menu)');

        expect(sheet()?.classList.contains('gate__sheet--open')).toBe(false);

        root.querySelector<HTMLButtonElement>('.gate__link--trigger')?.click();
        render();
        expect(sheet()?.classList.contains('gate__sheet--open')).toBe(true);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        render();
        expect(sheet()?.classList.contains('gate__sheet--open')).toBe(false);
    });

    it('держит узлы закрытых шторок в разметке и переключает язык', () => {
        expect(root.querySelectorAll('.gate__sheet').length).toBe(2);

        root.querySelectorAll<HTMLButtonElement>('.gate__icon')[1]?.click();

        expect(selectLanguage).toHaveBeenCalledTimes(1);
    });
});
