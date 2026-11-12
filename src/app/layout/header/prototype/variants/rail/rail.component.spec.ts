/**
 * Спеки варианта шапки «Угольный рельс».
 *
 * `HeaderState` подменяется лёгкой подделкой на сигналах: настоящий сервис
 * тянет десяток инфраструктурных зависимостей, а вариант проверяется на
 * разметке, шторках и телеметрии. Тяжёлые визуальные компоненты
 * (колокольчик, аватар, загрузчик картинок, иконки) исключаются подменой
 * импортов и настоящими заглушками с теми же селекторами.
 *
 * Сниженное движение в Karma не включается из теста, поэтому проверяется его
 * договорённость о разметке: закрытые шторки держат узлы в документе (inert,
 * а не вырезаны), отметка рельса существует в обоих состояниях сервера.
 */
import { Component, input, Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Language } from '@core/i18n';
import { HEADER_MAIN_LINKS } from '../../../config/header-main-links.constant';
import { HEADER_COMMUNITY_LINKS } from '../../../config/header-community-links.constant';
import { OnlineCount } from '../../../lib/occupancy-share.function';
import { HeaderState } from '../../../header-state.service';
import { RailComponent } from './rail.component';

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

describe('RailComponent', () => {
    let fixture: ComponentFixture<RailComponent>;
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

        TestBed.overrideComponent(RailComponent, {
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
        fixture = TestBed.createComponent(RailComponent);
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует знак, ряд разделов и угольный рельс из данных состояния', () => {
        render();

        expect(root.querySelector('a.rail__brand[href="/"]')).not.toBeNull();
        // Семь основных разделов гостя (включая гостевой пункт) + «Сообщество».
        expect(root.querySelectorAll('.rail__row .rail__link').length).toBe(HEADER_MAIN_LINKS.length + 1);
        expect(root.querySelector('.rail__track')).not.toBeNull();
    });

    it('без ответа сервера телеметрия показывает прочерк при нулевой доле', () => {
        render();

        expect(mustFind('.rail__count-now').textContent?.trim()).toBe('—');
        expect(mustFind('.rail__count-max').textContent?.trim()).toBe('/ —');
        expect(mustFind('.rail__clock').textContent?.trim()).toBe('—');
        expect(mustFind('.rail__track').style.getPropertyValue('--rail-fill')).toBe('0');
        expect(root.querySelector('.rail__tip--off')).not.toBeNull();
    });

    it('с ответом сервера показывает числа, долю и живую отметку', () => {
        state.online.set({ online: 42, max_online: 100 });
        state.occupancy.set(0.42);
        state.time.set('15 ноября, 3 год, 14:20');
        render();

        expect(mustFind('.rail__count-now').textContent?.trim()).toBe('42');
        expect(mustFind('.rail__count-max').textContent?.trim()).toBe('/ 100');
        expect(mustFind('.rail__clock').textContent?.trim()).toBe('15 ноября, 3 год, 14:20');
        expect(mustFind('.rail__track').style.getPropertyValue('--rail-fill')).toBe('0.42');
        expect(root.querySelector('.rail__tip--off')).toBeNull();
    });

    it('гостю показывает вход и прячет карточку игрока', () => {
        render();

        expect(root.querySelector('.rail__signin')).not.toBeNull();
        expect(root.querySelector('.rail__player')).toBeNull();
    });

    it('игроку показывает имя, баланс, точку внимания и выход', () => {
        state.isAuth.set(true);
        state.userName.set('Огнеяр');
        state.coins.set('1240');
        state.attention.set(true);
        render();

        expect(root.querySelector('.rail__signin')).toBeNull();
        expect(mustFind('.rail__player-name').textContent?.trim()).toBe('Огнеяр');
        expect(mustFind('.rail__coins').textContent).toContain('1240');
        expect(root.querySelector('.rail__avatar .rail__dot')).not.toBeNull();
        expect(root.querySelector('button[title="header.nav.signOut"]')).not.toBeNull();
    });

    it('«Сообщество» открывает индекс, Escape закрывает и возвращает фокус', () => {
        render();

        const trigger = root.querySelector<HTMLButtonElement>('.rail__link--trigger');

        trigger?.click();
        fixture.detectChanges();

        const sheet = mustFind('.rail__sheet:not(.rail__sheet--menu)');

        expect(trigger?.getAttribute('aria-expanded')).toBe('true');
        expect(sheet.classList.contains('rail__sheet--open')).toBe(true);
        expect(sheet.getAttribute('inert')).toBeNull();
        expect(sheet.querySelectorAll('.rail__entry').length).toBe(HEADER_COMMUNITY_LINKS.length);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();

        expect(trigger?.getAttribute('aria-expanded')).toBe('false');
        expect(sheet.classList.contains('rail__sheet--open')).toBe(false);
        expect(document.activeElement).toBe(trigger);
    });

    it('клик мимо шапки закрывает шторку меню', () => {
        render();

        const menu = root.querySelector<HTMLButtonElement>('.rail__menu');

        menu?.click();
        fixture.detectChanges();

        const sheet = mustFind('.rail__sheet--menu');

        expect(sheet.classList.contains('rail__sheet--open')).toBe(true);

        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(sheet.classList.contains('rail__sheet--open')).toBe(false);
        expect(menu?.getAttribute('aria-expanded')).toBe('false');
    });

    it('клик по разделу индекса закрывает шторку', () => {
        render();

        root.querySelector<HTMLButtonElement>('.rail__menu')?.click();
        fixture.detectChanges();

        const sheet = mustFind('.rail__sheet--menu');

        expect(sheet.classList.contains('rail__sheet--open')).toBe(true);

        sheet.querySelector<HTMLElement>('.rail__entry')?.click();
        fixture.detectChanges();

        expect(sheet.classList.contains('rail__sheet--open')).toBe(false);
    });

    it('переход на другой адрес закрывает открытую шторку', async () => {
        render();

        root.querySelector<HTMLButtonElement>('.rail__link--trigger')?.click();
        fixture.detectChanges();

        expect(mustFind('.rail__sheet:not(.rail__sheet--menu)').classList.contains('rail__sheet--open')).toBe(true);

        await router.navigateByUrl('/rules');
        fixture.detectChanges();

        expect(mustFind('.rail__sheet:not(.rail__sheet--menu)').classList.contains('rail__sheet--open')).toBe(false);
    });

    it('кнопка языка переключает локаль на противоположную', () => {
        render();

        root.querySelector<HTMLButtonElement>('button[title="header.language.select"]')?.click();

        expect(state.language()).toBe('en');

        root.querySelector<HTMLButtonElement>('button[title="header.language.select"]')?.click();

        expect(state.language()).toBe('ru');
    });

    it('закрытые шторки и отметка рельса держат узлы в разметке для покоя', () => {
        render();

        // Сниженное движение не вырезает содержимое: шторки закрыты через
        // `inert` и нулевую строку грида, узлы разделов остаются в документе.
        const sheet = mustFind('.rail__sheet:not(.rail__sheet--menu)');
        const menuSheet = mustFind('.rail__sheet--menu');

        expect(sheet.getAttribute('inert')).not.toBeNull();
        expect(menuSheet.getAttribute('inert')).not.toBeNull();
        expect(sheet.querySelectorAll('.rail__entry').length).toBe(HEADER_COMMUNITY_LINKS.length);
        expect(menuSheet.querySelectorAll('.rail__entry').length).toBe(
            HEADER_MAIN_LINKS.length + HEADER_COMMUNITY_LINKS.length + 1
        );
        expect(root.querySelector('.rail__tip')).not.toBeNull();
    });
});
