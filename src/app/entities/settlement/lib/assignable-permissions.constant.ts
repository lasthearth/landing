import { Permission } from '../model/permission';

/**
 * Права, которые владелец может назначать ролям в интерфейсе.
 *
 * `Permission.Unspecified` — нулевой элемент proto3-enum, он приходит с сервера,
 * но не является правом и в редакторе ролей не показывается. Матрица прав строит
 * колонки строго по этому списку, поэтому добавление права на бэкенде
 * требует одной правки — здесь.
 */
export const ASSIGNABLE_PERMISSIONS: readonly Permission[] = [
    Permission.InviteMember,
    Permission.ReviewJoinRequest,
];
