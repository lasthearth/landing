/**
 * Публичный API слайса «Роли поселения».
 */

export { RolesMatrixComponent } from './ui/roles-matrix/roles-matrix.component';
export { RoleFormDialogComponent } from './ui/role-form-dialog/role-form-dialog.component';
export { MemberRolesDialogComponent } from './ui/member-roles-dialog/member-roles-dialog.component';
export type { RoleFormResult } from './model/role-form-result';
export type { MemberRolesDialogData } from './model/member-roles-dialog-data';
export { isValidRoleName } from './lib/is-valid-role-name.function';
export { ROLE_NAME_MAX_LENGTH } from './config/role-name-max-length.constant';
