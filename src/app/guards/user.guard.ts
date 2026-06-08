import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserService } from '@app/services/user.service';
import { map, take } from 'rxjs';

/**
 * Страж для страницы профиля.
 */
export const userGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    return userService.authState$.pipe(
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
