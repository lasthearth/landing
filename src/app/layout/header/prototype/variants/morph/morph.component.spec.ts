import { Component, Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink, RouterLinkActive } from '@angular/router';
import { HeaderState } from '../../../header-state.service';
import { HeaderNavLink } from '../../../model/header-nav-link.interface';
import { MorphComponent } from './morph.component';

/**
 * Заглушки тяжёлых зависимостей шаблона: хост прототипа проверяется так же.
 * Селекторы и входы повторяют настоящие компоненты, чтобы биндинги шаблона
 * остались под проверкой.
 */
@Pipe({ name: 'translate', standalone: true })
class TranslatePipeStub implements PipeTransform {
    public transform(key: string): string {
        return key;
    }
}

@Pipe({ name: 'amount', standalone: true })
class AmountPipeStub implements PipeTransform {
    public transform(value: number | string | null | undefined): string {
        return String(value ?? '');
    }
}

@Component({ standalone: true, selector: 'tui-icon', template: '', inputs: ['icon'] })
class TuiIconStubComponent {
    public icon = '';
}

@Component({ standalone: true, selector: 'app-image-loader', template: '', inputs: ['src', 'alt'] })
class ImageLoaderStubComponent {
    public src = '';
    public alt = '';
}

@Component({
    standalone: true,
    selector: 'app-player-avatar',
    template: '',
    inputs: ['userId', 'src', 'alt', 'animated'],
})
class PlayerAvatarStubComponent {
    public userId: string | null = null;
    public src = '';
    public alt = '';
    public animated = true;
}

@Component({ standalone: true, selector: 'app-notification-bell', template: '' })
class NotificationBellStubComponent {}

/** Один раздел основного меню и два раздела «Сообщества» — этого хватает для счётчиков. */
const MAIN_LINKS: readonly HeaderNavLink[] = [
    { route: '/rules', icon: '@tui.file-text', labelKey: 'header.nav.rules' },
];

const COMMUNITY_LINKS: readonly HeaderNavLink[] = [
    { route: '/players', icon: '@tui.users-round', labelKey: 'header.nav.players' },
    { route: '/map', icon: '@tui.map', labelKey: 'header.nav.map' },
];

/**
 * Состояние шапки для тестов: сигналы и заглушки методов вместо настоящих сервисов.
 */
const createState = () => ({
    online: signal<{ online: number; max_online: number } | null>(null),
    time: signal<string | null>(null),
    occupancy: signal(0),
    isAuth: signal(false),
    userName: signal(''),
    userImage: signal(''),
    userId: signal<string | null>(null),
    coins: signal<string | null>(null),
    attention: signal(false),
    admin: signal(false),
    dark: signal(false),
    language: signal<'ru' | 'en'>('ru'),
    mainLinks: MAIN_LINKS,
    communityLinks: COMMUNITY_LINKS,
    communityActive: signal(false),
    communityFresh: signal(false),
    isFresh: () => false,
    toggleTheme: vi.fn(),
    selectLanguage: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
});

describe('MorphComponent', () => {
    let fixture: ComponentFixture<MorphComponent>;
    let root: HTMLElement;
    let state: ReturnType<typeof createState>;

    /**
     * Рисует компонент и возвращает корень шаблона.
     */
    const render = (): void => {
        fixture.detectChanges();
        root = fixture.nativeElement as HTMLElement;
    };

    /**
     * Ищет элемент по селектору с проверкой, что он есть.
     *
     * @param selector CSS-селектор.
     * @returns Найденный элемент.
     */
    const need = (selector: string): HTMLElement => {
        const element = root.querySelector<HTMLElement>(selector);

        expect(element).not.toBeNull();

        return element!;
    };

    beforeEach(async () => {
        state = createState();

        TestBed.overrideComponent(MorphComponent, {
            set: {
                imports: [
                    RouterLink,
                    RouterLinkActive,
                    TranslatePipeStub,
                    AmountPipeStub,
                    TuiIconStubComponent,
                    ImageLoaderStubComponent,
                    PlayerAvatarStubComponent,
                    NotificationBellStubComponent,
                ],
            },
        });
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: HeaderState, useValue: state }],
        });

        fixture = TestBed.createComponent(MorphComponent);
        render();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует знак проекта, дорожку навигации и триггер «Сообщества»', () => {
        expect(root.querySelector('.cap__brand')).not.toBeNull();
        expect(root.querySelectorAll('.cap__link').length).toBe(3);
        expect(need('.cap__trigger').textContent).toContain('header.nav.community');
    });

    it('гостю показывает вход и прячет карточку игрока', () => {
        expect(root.querySelector('.cap__signin')).not.toBeNull();
        expect(root.querySelector('.cap__chip')).toBeNull();
        expect(root.querySelector('.cap__bell')).toBeNull();
    });

    it('без ответа сервера телеметрия показывает прочерк', () => {
        expect(need('.cap__count-now').textContent?.trim()).toBe('—');
        expect(need('.cap__clock').textContent?.trim()).toBe('—');
    });

    it('данные онлайна попадают в счётчик и в долю занятости линии', () => {
        state.online.set({ online: 42, max_online: 100 });
        state.occupancy.set(0.42);
        state.time.set('12:34');
        fixture.detectChanges();

        expect(need('.cap__count-now').textContent?.trim()).toBe('42');
        expect(need('.cap__count-max').textContent?.trim()).toBe('/ 100');
        expect(need('.cap__clock').textContent?.trim()).toBe('12:34');
        expect(need('.cap__gauge').style.getPropertyValue('--cap-fill')).toBe('0.42');
    });

    it('игроку показывает чип с именем, колокольчик, точку внимания и выход', () => {
        state.isAuth.set(true);
        state.userName.set('Огнеяр');
        state.coins.set('1240');
        state.attention.set(true);
        fixture.detectChanges();

        expect(need('.cap__chip-name').textContent?.trim()).toBe('Огнеяр');
        expect(need('.cap__coins').textContent).toContain('1240');
        expect(root.querySelector('.cap__bell')).not.toBeNull();
        expect(root.querySelector('.cap__avatar .cap__dot')).not.toBeNull();

        root.querySelector<HTMLButtonElement>('button[aria-label="header.nav.signOut"]')?.click();
        expect(state.signOut).toHaveBeenCalled();
    });

    it('мега-панель закрыта, триггер открывает её и рисует пилюли разделов', () => {
        const panel = need('.cap__panel');
        const trigger = need('.cap__trigger') as HTMLButtonElement;

        expect(panel.hasAttribute('inert')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        trigger.click();
        fixture.detectChanges();

        expect(panel.hasAttribute('inert')).toBe(false);
        expect(panel.classList.contains('cap__panel--open')).toBe(true);
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        expect(root.querySelectorAll('.cap__pill').length).toBe(COMMUNITY_LINKS.length);
    });

    it('клик мимо шапки закрывает мега-панель', () => {
        (need('.cap__trigger') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(need('.cap__panel').classList.contains('cap__panel--open')).toBe(true);

        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(need('.cap__panel').classList.contains('cap__panel--open')).toBe(false);
        expect(need('.cap__panel').hasAttribute('inert')).toBe(true);
    });

    it('Escape закрывает шторку и возвращает фокус на триггер', () => {
        const trigger = need('.cap__trigger') as HTMLButtonElement;

        trigger.click();
        fixture.detectChanges();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();

        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(document.activeElement).toBe(trigger);
    });

    it('кнопка-меню открывает мобильную шторку со всеми разделами', () => {
        const burger = need('.cap__burger') as HTMLButtonElement;

        expect(burger.getAttribute('aria-expanded')).toBe('false');

        burger.click();
        fixture.detectChanges();

        expect(burger.getAttribute('aria-expanded')).toBe('true');
        expect(need('.cap__sheet').classList.contains('cap__sheet--open')).toBe(true);
        expect(need('.cap__sheet').hasAttribute('inert')).toBe(false);
        // Главная + один основной раздел + два раздела «Сообщества».
        expect(root.querySelectorAll('.cap__sheet .cap__row').length).toBe(4);
    });

    it('кнопка языка переключает локаль на противоположную', () => {
        root.querySelector<HTMLButtonElement>('button[aria-label="header.language.select"]')?.click();

        expect(state.selectLanguage).toHaveBeenCalledWith('en');
    });

    it('кнопка темы переключает тему оформления', () => {
        root.querySelector<HTMLButtonElement>('button[aria-label="header.theme.toggle"]')?.click();

        expect(state.toggleTheme).toHaveBeenCalled();
    });
});
