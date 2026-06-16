import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '@entities/user';
import { map, take } from 'rxjs';

/**
 * Страж для страницы администраторов.
 * Перенаправляет неавторизованных и не-админов на главную страницу.
 */
export const adminGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    return userService.authState$.pipe(
        take(1),
        map((isAuthenticated) => {
            if (isAuthenticated && userService.roles.includes('admin')) {
                return true;
            }

            return router.createUrlTree(['/home']);
        })
    );
};
