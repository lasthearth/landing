import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '@entities/user';
import { map, take } from 'rxjs';

/**
 * Страж гостевых страниц (например, «Начать игру»).
 * Вошедшего пользователя отправляет в профиль, на вкладку «Как начать играть»:
 * для него эта инструкция живёт там, а гостевая страница дублировала бы её.
 *
 * На сервере авторизация неизвестна — страж пропускает запрос, чтобы
 * пререндер собрал гостевую версию страницы.
 */
export const guestGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return true;
    }

    return userService.authSettled$.pipe(
        take(1),
        map((isAuthenticated) => (isAuthenticated ? router.createUrlTree(['/profile/how-play']) : true))
    );
};
