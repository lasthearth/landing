import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { UserService } from '../services/user.service';
import { map, take } from 'rxjs';

/**
 * Страж для страницы администраторов.
 */
export const adminGuard: CanActivateFn = () => {
    const userService = inject(UserService);

    return userService.authState$.pipe(
        take(1),
        map(isAuthenticated => {
            if (isAuthenticated && userService.roles.includes('admin')) {
                return true;
            } else {
                return false;
            }
        }),
    );
};
