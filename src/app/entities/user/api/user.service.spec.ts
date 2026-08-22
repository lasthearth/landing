import { TestBed } from '@angular/core/testing';
import { AuthenticatedResult, LoginResponse, OidcSecurityService, PublicEventsService } from 'angular-auth-oidc-client';
import { BehaviorSubject, of, Subject, take, toArray } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { UserService } from './user.service';

/**
 * Формирует незашифрованный JWT с заданной полезной нагрузкой.
 *
 * @param payload Claims для тела токена.
 * @returns Строка вида `header.payload.signature`.
 */
function makeJwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) => {
        const bytes = new TextEncoder().encode(JSON.stringify(value));
        const binary = String.fromCharCode(...bytes);

        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    return `${encode({ alg: 'none' })}.${encode(payload)}.sig`;
}

/**
 * Формирует ответ библиотеки о результате входа.
 *
 * @param isAuthenticated Признак успешной авторизации.
 * @returns Объект {@link LoginResponse}.
 */
function loginResponse(isAuthenticated: boolean): LoginResponse {
    return { isAuthenticated, userData: null, accessToken: '', idToken: '', configId: '0' };
}

describe('UserService', () => {
    const idToken = makeJwt({
        sub: 'user-1',
        name: 'Игрок',
        username: 'lisov',
        picture: 'https://cdn/avatar.png',
        roles: ['admin'],
        iat: 0,
    });

    let authenticated$: BehaviorSubject<AuthenticatedResult>;
    let checkAuth$: Subject<LoginResponse>;

    beforeEach(() => {
        authenticated$ = new BehaviorSubject<AuthenticatedResult>({
            isAuthenticated: false,
            allConfigsAuthenticated: [],
        });
        checkAuth$ = new Subject<LoginResponse>();

        const oidc = {
            get isAuthenticated$() {
                return authenticated$.asObservable();
            },
            getIdToken: () => of(idToken),
            getAccessToken: () => of('access-token'),
            checkAuth: () => checkAuth$,
            forceRefreshSession: () => of(loginResponse(false)),
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                UserService,
                { provide: OidcSecurityService, useValue: oidc },
                { provide: PublicEventsService, useValue: { registerForEvents: () => new Subject() } },
            ],
        });
    });

    it('заполняет данные пользователя до публикации authState$ = true', (done: DoneFn) => {
        const service = TestBed.inject(UserService);

        service.authState$.pipe(take(2), toArray()).subscribe((states) => {
            expect(states).toEqual([false, true]);
            expect(service.userId).toBe('user-1');
            expect(service.userName).toBe('lisov');
            expect(service.userImage).toBe('https://cdn/avatar.png');
            expect(service.roles).toEqual(['admin']);
            expect(service.accessToken).toBe('access-token');
            done();
        });

        authenticated$.next({ isAuthenticated: true, allConfigsAuthenticated: [] });
    });

    it('не выдаёт состояние авторизации, пока checkAuth не завершился', () => {
        const service = TestBed.inject(UserService);
        const seen: boolean[] = [];

        service.authSettled$.subscribe((isAuth) => seen.push(isAuth));

        expect(seen).toEqual([]);

        // Библиотека выставляет состояние на шаге валидации токенов,
        // то есть до завершения checkAuth.
        authenticated$.next({ isAuthenticated: true, allConfigsAuthenticated: [] });
        expect(seen).toEqual([]);

        checkAuth$.next(loginResponse(true));
        checkAuth$.complete();

        expect(seen).toEqual([true]);
    });
});
