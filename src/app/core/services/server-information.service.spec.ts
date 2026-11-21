/**
 * Спеки общего потока состояния сервера.
 *
 * `EventSource` в jsdom нет, поэтому вместо него подставляется класс-подделка:
 * он запоминает адрес соединения, отдаёт кадры и ошибки по требованию теста
 * и видит, закрыл ли сервис соединение. Сетевых запросов подделка не делает —
 * SSE-протокол проверяется на уровне кадров, а не транспорта.
 */
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@core/config/environments/environment';
import { IServerInfoSnapshot, ServerInformationService } from './server-information.service';

/**
 * Адрес фолбэк-запроса онлайна.
 */
const TOTAL_ONLINE_URL = `${environment.apiUrl}/serverinfo/totalonline`;

/**
 * Адрес фолбэк-запроса игрового времени.
 */
const WORLD_TIME_URL = `${environment.apiUrl}/serverinfo/worldtime`;

/**
 * Кадр с состоянием сервера в том виде, в каком его присылает бэкенд.
 */
const FRAME = '{"online":12,"max_online":100,"time":"Day 45 14:20"}';

/**
 * Подделка нативного `EventSource`.
 *
 * Хранит обработчики по типу события: сервис подписывается на кадр
 * `serverinfo` и на `error`.
 */
class EventSourceStub {
    /**
     * Все созданные соединения: по ним видно, сколько их открыл сервис.
     */
    public static instances: EventSourceStub[] = [];

    /**
     * Адрес, с которым открыто соединение.
     */
    public readonly url: string;

    /**
     * Признак закрытия соединения методом `close()`.
     */
    public closed = false;

    /**
     * Обработчики событий по типу.
     */
    private readonly listeners = new Map<string, Array<(event: Event) => void>>();

    /**
     * @param url Адрес потока.
     */
    public constructor(url: string) {
        this.url = url;
        EventSourceStub.instances.push(this);
    }

    /**
     * Запоминает обработчик события.
     *
     * @param type Тип события.
     * @param listener Обработчик.
     */
    public addEventListener(type: string, listener: (event: Event) => void): void {
        this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
    }

    /**
     * Убирает обработчик события.
     *
     * @param type Тип события.
     * @param listener Обработчик.
     */
    public removeEventListener(type: string, listener: (event: Event) => void): void {
        this.listeners.set(
            type,
            (this.listeners.get(type) ?? []).filter((item) => item !== listener)
        );
    }

    /**
     * Закрывает соединение, как нативный `EventSource`.
     */
    public close(): void {
        this.closed = true;
    }

    /**
     * Присылает кадр `serverinfo` с указанной полезной нагрузкой.
     *
     * @param data Строка `data` кадра.
     */
    public emitFrame(data: string): void {
        this.dispatch('serverinfo', { data } as MessageEvent<string>);
    }

    /**
     * Присылает событие обрыва соединения.
     */
    public emitError(): void {
        this.dispatch('error', new Event('error'));
    }

    /**
     * Вызывает все обработчики указанного типа.
     *
     * @param type Тип события.
     * @param event Объект события.
     */
    private dispatch(type: string, event: Event): void {
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
    }
}

describe('ServerInformationService — SSE', () => {
    let service: ServerInformationService;
    let http: HttpTestingController;

    beforeEach(() => {
        EventSourceStub.instances = [];
        vi.stubGlobal('EventSource', EventSourceStub);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: PLATFORM_ID, useValue: 'browser' },
            ],
        });

        service = TestBed.inject(ServerInformationService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        http.verify();
    });

    it('держит одно соединение на всех подписчиков и закрывает его после последней отписки', () => {
        const first: IServerInfoSnapshot[] = [];
        const second: IServerInfoSnapshot[] = [];

        const firstSub = service.watchServerInfo$().subscribe((snapshot) => first.push(snapshot));

        expect(EventSourceStub.instances).toHaveLength(1);

        const stream = EventSourceStub.instances[0];

        expect(stream.url).toBe(`${environment.apiUrl}/serverinfo/stream`);

        stream.emitFrame(FRAME);

        expect(first).toEqual([{ online: 12, max_online: 100, time: 'Day 45 14:20' }]);

        const secondSub = service.watchServerInfo$().subscribe((snapshot) => second.push(snapshot));

        expect(EventSourceStub.instances).toHaveLength(1);
        expect(second).toEqual([{ online: 12, max_online: 100, time: 'Day 45 14:20' }]);

        firstSub.unsubscribe();

        expect(stream.closed).toBe(false);

        secondSub.unsubscribe();

        expect(stream.closed).toBe(true);
    });

    it('игнорирует кадры, которые не похожи на состояние сервера', () => {
        const snapshots: IServerInfoSnapshot[] = [];
        const sub = service.watchServerInfo$().subscribe((snapshot) => snapshots.push(snapshot));
        const stream = EventSourceStub.instances[0];

        stream.emitFrame('не json');
        stream.emitFrame('{"online":"12"}');
        stream.emitFrame('null');

        expect(snapshots).toEqual([]);

        stream.emitFrame(FRAME);

        expect(snapshots).toEqual([{ online: 12, max_online: 100, time: 'Day 45 14:20' }]);

        sub.unsubscribe();
    });

    it('при обрыве отдаёт последний снимок и один раз дозапрашивает HTTP-фолбэк', () => {
        const snapshots: IServerInfoSnapshot[] = [];
        const sub = service.watchServerInfo$().subscribe((snapshot) => snapshots.push(snapshot));
        const stream = EventSourceStub.instances[0];

        stream.emitFrame(FRAME);
        snapshots.length = 0;

        stream.emitError();

        http.expectOne(TOTAL_ONLINE_URL).flush({ online: 3, max_online: 100 });
        http.expectOne(WORLD_TIME_URL).flush({ time: 'Day 46 08:00' });

        expect(snapshots).toEqual([
            { online: 12, max_online: 100, time: 'Day 45 14:20' },
            { online: 3, max_online: 100, time: 'Day 46 08:00' },
        ]);

        // Вторая ошибка той же сети: соединение живо, повторного запроса нет.
        stream.emitError();

        expect(stream.closed).toBe(false);
        expect(EventSourceStub.instances).toHaveLength(1);

        sub.unsubscribe();
    });
});

describe('ServerInformationService — сервер', () => {
    let service: ServerInformationService;
    let http: HttpTestingController;

    beforeEach(() => {
        EventSourceStub.instances = [];
        vi.stubGlobal('EventSource', EventSourceStub);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: PLATFORM_ID, useValue: 'server' },
            ],
        });

        service = TestBed.inject(ServerInformationService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        http.verify();
    });

    it('не создаёт EventSource и берёт первый рендер из HTTP-запроса', () => {
        const snapshots: IServerInfoSnapshot[] = [];
        let completed = false;

        service.watchServerInfo$().subscribe({
            next: (snapshot) => snapshots.push(snapshot),
            complete: () => {
                completed = true;
            },
        });

        expect(EventSourceStub.instances).toHaveLength(0);

        http.expectOne(TOTAL_ONLINE_URL).flush({ online: 7, max_online: 64 });
        http.expectOne(WORLD_TIME_URL).flush({ time: 'Day 45 14:20' });

        expect(snapshots).toEqual([{ online: 7, max_online: 64, time: 'Day 45 14:20' }]);
        expect(completed).toBe(true);
    });
});
