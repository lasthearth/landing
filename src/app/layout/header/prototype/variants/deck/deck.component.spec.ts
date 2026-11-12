/**
 * Спеки варианта шапки «Две палубы».
 *
 * `HeaderState` подменяется лёгкой подделкой на сигналах: настоящий сервис
 * тянет десяток инфраструктурных зависимостей, а вариант проверяется на
 * разметке, шторках и телеметрии. Тяжёлые визуальные компоненты
 * (колокольчик, аватар, загрузчик картинок, иконки) исключаются подменой
 * импортов и схемой пользовательских элементов.
 */
import { Component, input, Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Language } from '@core/i18n';
import { HEADER_MAIN_LINKS } from '../../../config/header-main-links.constant';
import { HEADER_COMMUNITY_LINKS } from '../../../config/header-community-links.constant';
import { OnlineCount } from '../../../lib/occupancy-share.function';
import { HeaderState } from '../../../header-state.service';
import { DeckComponent } from './deck.component';

/**
 * Заглушка перевода: возвращает ключ — по нему видно, из какого места
 * словаря пришла подпись.
 */
@Pipe({ standalone: true, name: 'translate' })
class TranslatePipeStub implements PipeTransform {
    public transform(key: string): string {
        return key;
    }
}

/**
 * Заглушка форматирования суммы: отдаёт строку как есть.
 */
@Pipe({ standalone: true, name: 'amount' })
class AmountPipeStub implements PipeTransform {
    public transform(value: string | null): string {
        return value ?? '';
    }
}

/**
 * Заглушка содержимого маршрута: роутеру нужен компонент для адреса.
 */
@Component({ standalone: true, template: '' })
class RouteStubComponent {}

/**
 * Заглушки визуальных компонентов варианта: схема пользовательских элементов
 * не работает для standalone-шаблона, поэтому тяжёлые компоненты подменяются
 * настоящими заглушками с теми же селекторами и входами.
 */
@Component({ standalone: true, selector: 'tui-icon', template: '' })
class TuiIconStubComponent {
    public readonly icon = input('');
}

@Component({ standalone: true, selector: 'app-image-loader', template: '' })
class ImageLoaderStubComponent {
    public readonly src = input('');
    public readonly alt = input('');
}

@Component({ standalone: true, selector: 'app-player-avatar', template: '' })
class PlayerAvatarStubComponent {
    public readonly userId = input<string | null>(null);
    public readonly src = input('');
    public readonly alt = input('');
    public readonly animated = input(true);
}

@Component({ standalone: true, selector: 'app-notification-bell', template: '' })
class NotificationBellStubComponent {}

/**
 * Подделка `HeaderState`: только сигналы и методы, которые читает вариант.
 */
function createFakeState() {
    const language = signal<Language>('ru');

    return {
        languageCalls: [] as Language[],
        online: signal<OnlineCount | null>(null),
        time: signal<string | null>(null),
        occupancy: signal(0),
        isAuth: signal(false),
        userName: signal(''),
        userImage: signal(''),
        userId: signal<string | null>(null),
        coins: signal<string | null>(null),
        attention: signal(false),
        dark: signal(false),
        language,
        mainLinks: HEADER_MAIN_LINKS,
        communityLinks: HEADER_COMMUNITY_LINKS,
        communityActive: signal(false),
        communityFresh: signal(false),
        isFresh: () => false,
        toggleTheme: () => {},
        selectLanguage: (value: Language) => {
            language.set(value);
        },
        signIn: () => {},
        signOut: () => {},
    };
}

/** Подделка состояния, приведённая к типу сервиса. */
type FakeState = ReturnType<typeof createFakeState>;

describe('DeckComponent', () => {
    let fixture: ComponentFixture<DeckComponent>;
    let router: Router;
    let root: HTMLElement;
    let state: FakeState;

    /**
     * Рисует компонент и исполняет отложенные эффекты рендера.
     */
    const render = (): void => {
        fixture.detectChanges();
        TestBed.flushEffects();
        root = fixture.nativeElement as HTMLElement;
    };

    /**
     * Ищет элемент по селектору и гарантирует, что он есть.
     *
     * @param selector CSS-селектор.
     * @returns Найденный элемент.
     */
    const mustFind = (selector: string): HTMLElement => {
        const element = root.querySelector<HTMLElement>(selector);

        if (!element) {
            throw new Error(`Не найден элемент ${selector}`);
        }

        return element;
    };

    beforeEach(async () => {
        state = createFakeState();

        TestBed.overrideComponent(DeckComponent, {
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
            providers: [
                provideRouter([{ path: '**', component: RouteStubComponent }]),
                { provide: HeaderState, useValue: state as unknown as HeaderState },
            ],
        });

        router = TestBed.inject(Router);
        await router.navigateByUrl('/');
        fixture = TestBed.createComponent(DeckComponent);
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует знак, строку телеметрии и всё меню из данных состояния', () => {
        render();

        expect(root.querySelector('a.deck__brand[href="/"]')).not.toBeNull();
        // Главная + семь основных разделов (гость видит гостевой пункт) + «Сообщество».
        expect(root.querySelectorAll('.deck__nav-list [data-pill-key]').length).toBe(9);
        expect(root.querySelector('.deck__strip')).not.toBeNull();
    });

    it('без ответа сервера телеметрия показывает прочерк при нулевой доле', () => {
        render();

        expect(mustFind('.deck__count-now').textContent?.trim()).toBe('—');
        expect(mustFind('.deck__count-max').textContent?.trim()).toBe('/ —');
        expect(mustFind('.deck__gauge').style.getPropertyValue('--deck-fill')).toBe('0');
        expect(root.querySelector('.deck__live--off')).not.toBeNull();
    });

    it('с ответом сервера показывает числа, долю и живую точку', () => {
        state.online.set({ online: 42, max_online: 100 });
        state.occupancy.set(0.42);
        render();

        expect(mustFind('.deck__count-now').textContent?.trim()).toBe('42');
        expect(mustFind('.deck__count-max').textContent?.trim()).toBe('/ 100');
        expect(mustFind('.deck__gauge').style.getPropertyValue('--deck-fill')).toBe('0.42');
        expect(root.querySelector('.deck__live--off')).toBeNull();
    });

    it('гостю показывает вход и прячет карточку игрока', () => {
        render();

        expect(root.querySelector('.deck__signin')).not.toBeNull();
        expect(root.querySelector('.deck__player')).toBeNull();
    });

    it('игроку показывает имя, баланс, точку внимания и выход', () => {
        state.isAuth.set(true);
        state.userName.set('Огнеяр');
        state.coins.set('1240');
        state.attention.set(true);
        render();

        expect(root.querySelector('.deck__signin')).toBeNull();
        expect(mustFind('.deck__player-name').textContent?.trim()).toBe('Огнеяр');
        expect(mustFind('.deck__coins').textContent).toContain('1240');
        expect(root.querySelector('.deck__avatar .deck__dot')).not.toBeNull();
        expect(root.querySelector('button[title="header.nav.signOut"]')).not.toBeNull();
    });

    it('«Сообщество» открывает манифест, Escape закрывает и возвращает фокус', () => {
        render();

        const trigger = root.querySelector<HTMLButtonElement>('.deck__item-wrap button');

        trigger?.click();
        fixture.detectChanges();

        expect(trigger?.getAttribute('aria-expanded')).toBe('true');
        expect(mustFind('.deck__sheet').classList.contains('deck__sheet--open')).toBe(true);
        expect(mustFind('.deck__sheet').getAttribute('inert')).toBeNull();
        expect(root.querySelectorAll('.deck__sheet:not(.deck__sheet--menu) .deck__cell').length).toBe(
            HEADER_COMMUNITY_LINKS.length
        );

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();

        expect(trigger?.getAttribute('aria-expanded')).toBe('false');
        expect(mustFind('.deck__sheet').classList.contains('deck__sheet--open')).toBe(false);
        expect(document.activeElement).toBe(trigger);
    });

    it('клик мимо шапки закрывает шторку мобильного меню', () => {
        render();

        const menu = root.querySelector<HTMLButtonElement>('.deck__menu');

        menu?.click();
        fixture.detectChanges();

        const sheet = mustFind('.deck__sheet--menu');

        expect(sheet.classList.contains('deck__sheet--open')).toBe(true);

        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(sheet.classList.contains('deck__sheet--open')).toBe(false);
        expect(menu?.getAttribute('aria-expanded')).toBe('false');
    });

    it('клик по ячейке мобильного меню закрывает шторку', () => {
        render();

        root.querySelector<HTMLButtonElement>('.deck__menu')?.click();
        fixture.detectChanges();

        const sheet = mustFind('.deck__sheet--menu');

        expect(sheet.classList.contains('deck__sheet--open')).toBe(true);

        sheet.querySelector<HTMLElement>('.deck__cell')?.click();
        fixture.detectChanges();

        expect(sheet.classList.contains('deck__sheet--open')).toBe(false);
    });

    it('переход на другой адрес закрывает открытую шторку', async () => {
        render();

        root.querySelector<HTMLButtonElement>('.deck__item-wrap button')?.click();
        fixture.detectChanges();

        expect(mustFind('.deck__sheet').classList.contains('deck__sheet--open')).toBe(true);

        await router.navigateByUrl('/rules');
        fixture.detectChanges();

        expect(mustFind('.deck__sheet').classList.contains('deck__sheet--open')).toBe(false);
    });

    it('кнопка языка переключает локаль на противоположную', () => {
        render();

        root.querySelector<HTMLButtonElement>('button[title="header.language.select"]')?.click();

        expect(state.language()).toBe('en');

        root.querySelector<HTMLButtonElement>('button[title="header.language.select"]')?.click();

        expect(state.language()).toBe('ru');
    });

    it('пилюля невидима до удачного замера и скрыта от скринридера', () => {
        render();

        const pill = mustFind('.deck__pill');

        // В jsdom-подобной среде прямоугольники нулевые — пилюля обязана прятаться.
        expect(pill.classList.contains('deck__pill--on')).toBe(false);
        expect(pill.getAttribute('aria-hidden')).toBe('true');
    });
});
