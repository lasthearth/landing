import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { I18nService } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { UserService } from '@entities/user';

import { MyJoinRequestsStore } from './my-join-requests.store';

/**
 * Минимальная группа для ответа `GET /users/{id}/memberships`:
 * хранилище смотрит только на наличие полей.
 */
interface Memberships {
    settlement?: { id: string };
    guild?: { id: string };
}

describe('MyJoinRequestsStore', () => {
    let store: MyJoinRequestsStore;
    let http: HttpTestingController;

    /**
     * Роли текущего пользователя: `['player']` — верифицирован, `[]` — нет.
     * Массив один на тест, меняется на месте до вызова `load()`.
     */
    let roles: string[];

    beforeEach(() => {
        roles = ['player'];

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: UserService, useValue: { userId: 'user-1', roles } },
                { provide: I18nService, useValue: { translate: (key: string) => key } },
                { provide: RequestStatusService, useValue: { showSuccess: () => {}, showError: () => {} } },
            ],
        });

        store = TestBed.inject(MyJoinRequestsStore);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        http.verify();
    });

    /**
     * Отвечает на оба ожидающих запроса хранилища.
     *
     * @param memberships Группы игрока из `GET /users/{id}/memberships`.
     */
    function flush(memberships: Memberships): void {
        http
            .expectOne((request) => request.url.endsWith('/users/user-1/memberships'))
            .flush(memberships);
        http
            .expectOne((request) => request.url.endsWith('/users/user-1/settlements/join-requests'))
            .flush({ join_requests: [] });
    }

    it('до загрузки членств кнопку не показывает', () => {
        store.load();

        expect(store.canApplyTo('settlement')).toBeFalse();
        expect(store.canApplyTo('guild')).toBeFalse();

        flush({});
    });

    it('гость не может подать заявку и не видит подсказку о верификации', () => {
        TestBed.inject(UserService).userId = '';

        store.load();

        expect(store.canApplyTo('settlement')).toBeFalse();
        expect(store.canApplyTo('guild')).toBeFalse();
        expect(store.needsVerificationFor('settlement')).toBeFalse();
        expect(store.needsVerificationFor('guild')).toBeFalse();
    });

    it('игрок в наделе не подаёт заявку в надел, но может — в гильдию', () => {
        store.load();

        flush({ settlement: { id: 's1' } });

        expect(store.canApplyTo('settlement')).toBeFalse();
        expect(store.canApplyTo('guild')).toBeTrue();
    });

    it('игрок в гильдии не подаёт заявку в гильдию, но может — в надел', () => {
        store.load();

        flush({ guild: { id: 'g1' } });

        expect(store.canApplyTo('settlement')).toBeTrue();
        expect(store.canApplyTo('guild')).toBeFalse();
    });

    it('игрок в обеих группах не подаёт заявки никуда', () => {
        store.load();

        flush({ settlement: { id: 's1' }, guild: { id: 'g1' } });

        expect(store.canApplyTo('settlement')).toBeFalse();
        expect(store.canApplyTo('guild')).toBeFalse();
    });

    it('игрок без групп подаёт заявки в оба рода', () => {
        store.load();

        flush({});

        expect(store.canApplyTo('settlement')).toBeTrue();
        expect(store.canApplyTo('guild')).toBeTrue();
    });

    it('неверифицированный игрок видит подсказку вместо кнопки', () => {
        roles.length = 0;

        store.load();

        flush({});

        expect(store.canApplyTo('settlement')).toBeFalse();
        expect(store.canApplyTo('guild')).toBeFalse();
        expect(store.needsVerificationFor('settlement')).toBeTrue();
        expect(store.needsVerificationFor('guild')).toBeTrue();
    });

    it('неверифицированный игрок в наделе видит подсказку только на гильдиях', () => {
        roles.length = 0;

        store.load();

        flush({ settlement: { id: 's1' } });

        expect(store.needsVerificationFor('settlement')).toBeFalse();
        expect(store.needsVerificationFor('guild')).toBeTrue();
    });
});
