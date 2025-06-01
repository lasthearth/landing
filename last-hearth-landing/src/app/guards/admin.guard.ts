import { inject } from "@angular/core";
import { CanActivateFn } from "@angular/router";
import { UserService } from "../services/user.service";

/**
 * Страж для страницы администраторов.
 */
export const adminGuard: CanActivateFn = () => {
    const userService = inject(UserService);
    if (userService.isAuthorize() && userService.roles.includes('admin')) {
        return true;
    }

    return false;
};
