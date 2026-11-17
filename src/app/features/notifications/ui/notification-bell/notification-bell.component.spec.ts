/**
 * Спек колокольчика уведомлений: панель обязана уходить из DOM после закрытия.
 *
 * Имя кадра выхода в DOM несёт префикс области видимости компонента
 * (`_ngcontent-ng-c1_bell-panel-exit`). Сравнение с литералом не срабатывало,
 * панель оставалась в DOM невидимой и ловила клики по правой части шапки:
 * «Сообщество» и «Магазин» уводили на главную. Здесь это ловится на уровне
 * компонента — быстрее и точнее, чем через браузер.
 */
import { Component, input, Pipe, PipeTransform, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationsFeedService } from '../../api/notifications-feed.service';
import { FeedNotification, NotificationPrefs } from '../../model/feed-notification';
import { NotificationBellComponent } from './notification-bell.component';

/**
 * Заглушка перевода: возвращает ключ.
 */
@Pipe({ standalone: true, name: 'translate' })
class TranslatePipeStub implements PipeTransform {
    public transform(key: string): string {
        return key;
    }
}

/**
 * Заглушка иконки.
 */
@Component({ standalone: true, selector: 'tui-icon', template: '' })
class TuiIconStubComponent {
    public readonly icon = input('');
}

/**
 * Заглушка относительного времени: оригинал тянет словарь и часы.
 */
@Component({ standalone: true, selector: 'time[appRelativeTime]', template: '' })
class RelativeTimeStubComponent {
    public readonly appRelativeTime = input<Date | null>(null);
}

/**
 * Собирает событие конца анимации с именем кадра из DOM.
 *
 * @param name Имя кадра.
 * @returns Событие для обработчика.
 */
function animationEnd(name: string): AnimationEvent {
    const event = new Event('animationend', { bubbles: true });

    Object.defineProperty(event, 'animationName', { value: name });

    return event as AnimationEvent;
}

/**
 * Подделка ленты: одна ссылка на главную — как у общего уведомления о новости.
 */
function createFakeFeed() {
    const item: FeedNotification = {
        id: '1',
        title: 'Новость',
        message: 'Вышла новость',
        createdAt: null,
        broadcast: true,
        read: false,
        link: '/',
        category: 'news',
    };

    return {
        start: vi.fn(),
        items: signal<FeedNotification[]>([item]),
        allItems: signal<FeedNotification[]>([item]),
        unreadCount: signal(1),
        hiddenCount: signal(0),
        prefs: signal<NotificationPrefs>({ news: true, events: true, personal: true }),
        markRead: vi.fn(),
        markAllRead: vi.fn(),
        setPref: vi.fn(),
    };
}

describe('NotificationBellComponent', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<NotificationBellComponent>>;
    let feed: ReturnType<typeof createFakeFeed>;

    /**
     * Панель в DOM или `null`.
     */
    function panel(): HTMLElement | null {
        return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.bell__fly');
    }

    /**
     * Жмёт по колокольчику — так же, как игрок.
     */
    async function clickBell(): Promise<void> {
        const bell = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-haspopup="true"]');

        bell?.click();
        fixture.detectChanges();
        await fixture.whenStable();
    }

    beforeEach(async () => {
        feed = createFakeFeed();

        TestBed.overrideComponent(NotificationBellComponent, {
            set: { imports: [TranslatePipeStub, TuiIconStubComponent, RelativeTimeStubComponent] },
        });
        await TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: NotificationsFeedService, useValue: feed }],
        }).compileComponents();

        fixture = TestBed.createComponent(NotificationBellComponent);
        await fixture.whenStable();
    });

    it('показывает панель по клику по колокольчику', async () => {
        await clickBell();

        expect(panel()).not.toBeNull();
    });

    it('снимает панель после выхода, когда кадр пришёл с префиксом области видимости', async () => {
        await clickBell();
        await clickBell();

        const fly = panel();

        expect(fly).not.toBeNull();

        fly?.dispatchEvent(animationEnd('_ngcontent-ng-c1_bell-panel-exit'));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(panel()).toBeNull();
    });

    it('держит панель в DOM, пока выход не докрутился', async () => {
        await clickBell();
        await clickBell();

        expect(panel()).not.toBeNull();

        panel()?.dispatchEvent(animationEnd('_ngcontent-ng-c1_bell-panel-enter'));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(panel()).not.toBeNull();
    });
});
