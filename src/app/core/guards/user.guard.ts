import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '@entities/user';
import { map, take } from 'rxjs';

/**
 * Страж для страницы профиля.
 * Ждёт завершения проверки авторизации, иначе при прямом переходе по ссылке
 * авторизованный пользователь получил бы редирект на главную.
 */
export const userGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

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
