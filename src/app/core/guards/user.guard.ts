import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '@entities/user';
import { map, take } from 'rxjs';

/**
 * Страж для страницы профиля.
 * Ждёт завершения проверки авторизации, иначе при прямом переходе по ссылке
 * авторизованный пользователь получил бы редирект на главную.
 *
 * На сервере проверка авторизации не выполняется (нет доступа к токенам), поэтому
 * страж пропускает запрос: иначе SSR-рендер ждал бы поток, который никогда не эмитит.
 */
export const userGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return true;
    }

    return userService.authSettled$.pipe(
        take(1),
        map((isAuthenticated) => {
            if (isAuthenticated) {
                return true;
            } else {
                router.navigate(['/home']);
                return false;
            }
        })
    );
};
