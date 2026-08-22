import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '@entities/user';
import { map, take } from 'rxjs';

/**
 * Страж для страницы администраторов.
 * Перенаправляет неавторизованных и не-админов на главную страницу.
 * Ждёт завершения проверки авторизации, чтобы не отбросить админа
 * при прямом переходе по ссылке.
 *
 * На сервере проверка авторизации не выполняется, поэтому страж пропускает запрос:
 * иначе SSR-рендер ждал бы поток, который никогда не эмитит.
 */
export const adminGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return true;
    }

    return userService.authSettled$.pipe(
        take(1),
        map((isAuthenticated) => {
            if (isAuthenticated && userService.roles.includes('admin')) {
                return true;
            }

            return router.createUrlTree(['/home']);
        })
    );
};
