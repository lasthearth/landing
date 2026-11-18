/**
 * Спеки варианта шапки «Корона».
 *
 * `HeaderState` подменяется лёгкой подделкой на сигналах: настоящий сервис
 * тянет десяток инфраструктурных зависимостей, а вариант проверяется на
 * разметке, шторках и телеметрии. Тяжёлые визуальные компоненты
 * (колокольчик, аватар, загрузчик картинок, иконки) исключаются подменой
 * импортов настоящими заглушками с теми же селекторами и входами.
 */
import { Component, input, Pipe, PipeTransform, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Language } from '@core/i18n';
import { HEADER_MAIN_LINKS } from '../config/header-main-links.constant';
import { HEADER_COMMUNITY_LINKS } from '../config/header-community-links.constant';
import { OnlineCount } from '../model/online-count.interface';
import { HeaderState } from '../header-state.service';
import { CrownComponent } from './crown.component';

/**
 * Заглушка перевода: возвращает ключ — по нему видно, из какого места
 * словаря пришла подпись.
 */
@Pipe({ name: 'translate' })
class TranslatePipeStub implements PipeTransform {
    public transform(key: string): string {
        return key;
    }
}

/**
 * Заглушка форматирования суммы: отдаёт строку как есть.
 */
@Pipe({ name: 'amount' })
class AmountPipeStub implements PipeTransform {
    public transform(value: string | null): string {
        return value ?? '';
    }
}

/**
 * Заглушка содержимого маршрута: роутеру нужен компонент для адреса.
 */
@Component({ template: '' })
class RouteStubComponent {}

/**
 * Заглушки визуальных компонентов варианта: схема пользовательских элементов
 * не работает для standalone-шаблона, поэтому тяжёлые компоненты подменяются
 * настоящими заглушками с теми же селекторами и входами.
 */
@Component({ selector: 'tui-icon', template: '' })
class TuiIconStubComponent {
    public readonly icon = input('');
}

@Component({ selector: 'app-image-loader', template: '' })
class ImageLoaderStubComponent {
    public readonly src = input('');
    public readonly alt = input('');
}

@Component({ selector: 'app-player-avatar', template: '' })
class PlayerAvatarStubComponent {
    public readonly userId = input<string | null>(null);
    public readonly src = input('');
    public readonly alt = input('');
    public readonly animated = input(true);
}

@Component({ selector: 'app-notification-bell', template: '' })
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
        isAuth: signal(false),
        authKnown: signal(true),
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

describe('CrownComponent', () => {
    let fixture: ComponentFixture<CrownComponent>;
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

        TestBed.overrideComponent(CrownComponent, {
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
        fixture = TestBed.createComponent(CrownComponent);
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('рисует знак, строку телеметрии и весь ряд ссылок из данных состояния', () => {
        render();

        expect(root.querySelector('a.crown__brand[href="/"]')).not.toBeNull();
        expect(root.querySelector('.crown__strip')).not.toBeNull();
        expect(root.querySelector('.crown__crest .crown__name')).not.toBeNull();
        // Главная + семь основных разделов (гость видит гостевой пункт) + «Сообщество».
        expect(root.querySelectorAll('.crown__row a, .crown__row button').length).toBe(9);
    });

    it('без ответа сервера телеметрия показывает прочерки', () => {
        render();

        expect(mustFind('.crown__count-now').textContent?.trim()).toBe('—');
        expect(mustFind('.crown__count-max').textContent?.trim()).toBe('/ —');
        expect(mustFind('.crown__clock').textContent?.trim()).toBe('—');
    });

    it('с ответом сервера показывает числа онлайна и игровое время', () => {
        state.online.set({ online: 42, max_online: 100 });
        state.time.set('12 сентября, 3 год, 06:59');
        render();

        expect(mustFind('.crown__count-now').textContent?.trim()).toBe('42');
        expect(mustFind('.crown__count-max').textContent?.trim()).toBe('/ 100');
        expect(mustFind('.crown__clock').textContent?.trim()).toBe('12 сентября, 3 год, 06:59');
    });

    it('пересоздаёт число онлайна при смене и оставляет узел при том же значении', () => {
        state.online.set({ online: 42, max_online: 100 });
        render();

        const before = mustFind('.crown__count-now');
        expect(before.classList.contains('lh-value-swap')).toBe(true);

        // Поток принёс тот же онлайн: узел живёт дальше, анимация не играет.
        state.online.set({ online: 42, max_online: 100 });
        render();
        expect(mustFind('.crown__count-now')).toBe(before);

        // Онлайн изменился: новый узел, поэтому вход `.lh-value-swap` проиграется.
        state.online.set({ online: 43, max_online: 100 });
        render();

        const after = mustFind('.crown__count-now');
        expect(after).not.toBe(before);
        expect(after.textContent?.trim()).toBe('43');
    });

    it('гостю показывает вход и прячет карточку игрока', () => {
        render();

        expect(root.querySelector('.crown__signin')).not.toBeNull();
        expect(root.querySelector('.crown__player')).toBeNull();
    });

    it('пока вход не определился, не рисует гостевые разделы', () => {
        state.authKnown.set(false);
        render();

        // Главная, шесть основных разделов и «Сообщество»: без «Начать игру».
        expect(root.querySelectorAll('.crown__row a, .crown__row button').length).toBe(8);
    });

    it('игроку показывает имя, баланс, точку внимания и выход', () => {
        state.isAuth.set(true);
        state.userName.set('Огнеяр');
        state.coins.set('1240');
        state.attention.set(true);
        render();

        expect(root.querySelector('.crown__signin')).toBeNull();
        expect(mustFind('.crown__player-name').textContent?.trim()).toBe('Огнеяр');
        expect(mustFind('.crown__coins').textContent).toContain('1240');
        expect(root.querySelector('.crown__avatar .crown__dot')).not.toBeNull();
        expect(root.querySelector('button[title="header.nav.signOut"]')).not.toBeNull();
    });

    it('«Сообщество» открывает мега-панель, Escape закрывает и возвращает фокус', () => {
        render();

        const trigger = root.querySelector<HTMLButtonElement>('.crown__link--trigger');

        trigger?.click();
        fixture.detectChanges();

        expect(trigger?.getAttribute('aria-expanded')).toBe('true');
        expect(mustFind('.crown__sheet').classList.contains('crown__sheet--open')).toBe(true);
        expect(mustFind('.crown__sheet').getAttribute('inert')).toBeNull();
        expect(root.querySelectorAll('.crown__sheet:not(.crown__sheet--menu) .crown__tile').length).toBe(
            HEADER_COMMUNITY_LINKS.length
        );

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        fixture.detectChanges();

        expect(trigger?.getAttribute('aria-expanded')).toBe('false');
        expect(mustFind('.crown__sheet').classList.contains('crown__sheet--open')).toBe(false);
        expect(document.activeElement).toBe(trigger);
    });

    it('клик мимо шапки закрывает шторку мобильного меню', () => {
        render();

        const menu = root.querySelector<HTMLButtonElement>('.crown__menu');

        menu?.click();
        fixture.detectChanges();

        const sheet = mustFind('.crown__sheet--menu');

        expect(sheet.classList.contains('crown__sheet--open')).toBe(true);

        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(sheet.classList.contains('crown__sheet--open')).toBe(false);
        expect(menu?.getAttribute('aria-expanded')).toBe('false');
    });

    it('клик по плитке мобильного меню закрывает шторку', () => {
        render();

        root.querySelector<HTMLButtonElement>('.crown__menu')?.click();
        fixture.detectChanges();

        const sheet = mustFind('.crown__sheet--menu');

        expect(sheet.classList.contains('crown__sheet--open')).toBe(true);

        sheet.querySelector<HTMLElement>('.crown__tile')?.click();
        fixture.detectChanges();

        expect(sheet.classList.contains('crown__sheet--open')).toBe(false);
    });

    it('переход на другой адрес закрывает открытую шторку', async () => {
        render();

        root.querySelector<HTMLButtonElement>('.crown__link--trigger')?.click();
        fixture.detectChanges();

        expect(mustFind('.crown__sheet').classList.contains('crown__sheet--open')).toBe(true);

        await router.navigateByUrl('/rules');
        fixture.detectChanges();

        expect(mustFind('.crown__sheet').classList.contains('crown__sheet--open')).toBe(false);
    });

    it('кнопка языка переключает локаль на противоположную', () => {
        render();

        root.querySelector<HTMLButtonElement>('button[title="header.language.select"]')?.click();

        expect(state.language()).toBe('en');

        root.querySelector<HTMLButtonElement>('button[title="header.language.select"]')?.click();

        expect(state.language()).toBe('ru');
    });

    it('закрытая шторка прячется обрезанием, а не удалением узлов', () => {
        render();

        const sheet = mustFind('.crown__sheet');
        const clip = mustFind('.crown__sheet-clip');

        // Узлы плиток на месте: скрытие даёт нулевая строка грида и `inert`,
        // а не `display: none` и не удаление узлов.
        expect(sheet.querySelectorAll('.crown__tile').length).toBe(HEADER_COMMUNITY_LINKS.length);
        expect(sheet.getAttribute('inert')).not.toBeNull();
        expect(getComputedStyle(clip).overflow).toBe('hidden');
        expect(getComputedStyle(sheet).display).not.toBe('none');
    });

    it('при prefers-reduced-motion держит содержимое видимым и снимает дыхание', () => {
        const canMatch = typeof window.matchMedia === 'function';
        const reduced = canMatch && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        state.online.set({ online: 42, max_online: 100 });
        render();

        root.querySelector<HTMLButtonElement>('.crown__link--trigger')?.click();
        fixture.detectChanges();

        const tile = mustFind('.crown__sheet--open .crown__tile');

        // Ни один узел не спрятан: плитки в дереве и не `display: none`.
        expect(getComputedStyle(tile).display).not.toBe('none');

        if (reduced) {
            // Живая ветка reduce: дыхание снято, сияние стоит видимым, плитки непрозрачны.
            expect(getComputedStyle(mustFind('.crown__aura')).animationName).toBe('none');
            expect(getComputedStyle(tile).opacity).toBe('1');

            return;
        }

        // Среда без reduce: контракт ветки читается из стилей компонента —
        // дыхание снято, сияние и плитки остаются видимыми.
        const reducedRules: CSSStyleRule[] = [];

        for (const sheet of Array.from(document.styleSheets)) {
            let rules: CSSRule[] = [];

            try {
                rules = Array.from(sheet.cssRules);
            } catch {
                rules = [];
            }

            for (const rule of rules) {
                const media = rule as CSSMediaRule;
                const condition = media.conditionText ?? media.media?.mediaText ?? '';

                if (condition.includes('prefers-reduced-motion')) {
                    reducedRules.push(...(Array.from(media.cssRules) as CSSStyleRule[]));
                }
            }
        }

        // Селекторы приходят с атрибутом инкапсуляции, поэтому ищем по подстроке.
        const auraRule = reducedRules.find((rule) => rule.selectorText.includes('.crown__aura'));
        const auraMotion =
            auraRule?.style.getPropertyValue('animation-name') || auraRule?.style.getPropertyValue('animation');
        const tileVisible = reducedRules.some(
            (rule) =>
                rule.selectorText.includes('.crown__tile') &&
                rule.style.opacity === '1' &&
                rule.style.transform === 'none'
        );

        expect(auraMotion ?? '').toContain('none');
        expect(tileVisible).toBe(true);
    });
});

/**
 * Серверный рендер: без браузерных API шапка обязана рисоваться молча.
 * Красный сигнал — не только throw: если замер ссылок снова пойдёт на
 * сервере, полоса получит координаты и класс открытого состояния.
 */
describe('CrownComponent на сервере', () => {
    let fixture: ComponentFixture<CrownComponent>;
    let router: Router;
    let root: HTMLElement;

    /**
     * Счётчики обращений к браузерным API: на сервере гейт платформы обязан
     * не дойти до них вовсе, поэтому сам факт обращения — красный сигнал.
     */
    const browserTouches = { fonts: 0, observers: 0 };

    beforeEach(async () => {
        browserTouches.fonts = 0;
        browserTouches.observers = 0;

        Object.defineProperty(document, 'fonts', {
            configurable: true,
            get() {
                browserTouches.fonts += 1;

                return { ready: Promise.resolve() };
            },
        });
        vi.stubGlobal(
            'ResizeObserver',
            class {
                public constructor() {
                    browserTouches.observers += 1;
                }

                public observe(): void {}
                public disconnect(): void {}
            }
        );

        TestBed.overrideComponent(CrownComponent, {
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
                { provide: HeaderState, useValue: createFakeState() as unknown as HeaderState },
                { provide: PLATFORM_ID, useValue: 'server' },
            ],
        });

        router = TestBed.inject(Router);
        /* Адрес с активным разделом до создания компонента: без гейта
           платформы замер случился бы уже в ngAfterViewInit. */
        await router.navigateByUrl('/rules');
        fixture = TestBed.createComponent(CrownComponent);
    });

    afterEach(() => {
        fixture.destroy();
        vi.unstubAllGlobals();
        Reflect.deleteProperty(document as unknown as Record<string, unknown>, 'fonts');
    });

    it('рендерится без замеров: полоса скрыта до гидратации и после перехода', async () => {
        fixture.detectChanges();
        TestBed.flushEffects();
        root = fixture.nativeElement as HTMLElement;

        const slide = root.querySelector<HTMLElement>('.crown__slide');

        expect(slide).not.toBeNull();
        expect(slide?.classList.contains('crown__slide--on')).toBe(false);

        await router.navigateByUrl('/');
        fixture.detectChanges();

        /* Кадр на переходе: без гейта в подписке роутера замер случился
           бы здесь, и полоса получила бы класс открытого состояния. */
        await new Promise((resolve) => setTimeout(resolve, 50));
        fixture.detectChanges();

        expect(slide?.classList.contains('crown__slide--on')).toBe(false);
        expect(root.querySelector('.crown__sheet')?.classList.contains('crown__sheet--open')).toBe(false);
        expect(browserTouches.fonts).toBe(0);
        expect(browserTouches.observers).toBe(0);
    });
});
