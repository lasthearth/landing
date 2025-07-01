import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { UserService } from "../services/user.service";

/**
 * Страж для страницы профиля.
 */
export const userGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    const router = inject(Router);

    if (userService.isAuthorize()) {
        return true;
    }

    router.navigate(['/home']);
    return false;
};
