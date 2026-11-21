/**
 * Скоупы, которые сайт запрашивает у Logto при входе.
 *
 * Logto кладёт в access token только те права, которые клиент попросил явно и
 * которые выданы роли пользователя. Право, выданное в Logto, но не запрошенное
 * здесь, в токен не попадает: `hasScope` возвращает false, а сервер отвечает
 * `403 PERMISSION_DENIED`. Поэтому каждое новое право сначала добавляется
 * сюда, а уже потом проверяется в интерфейсе.
 *
 * Порядок — по доменам, как в меню админки. Список сверяется с константами
 * фич в `logto-scopes.constant.spec.ts`.
 */
export const LOGTO_SCOPES: readonly string[] = [
    'openid',
    'profile',
    'email',
    'roles',
    'question:create',
    'question:list',
    'question:delete',
    'user:verify',
    'settlements:manage',
    'tags:create',
    'tags:delete',
    'tags:manage',
    'donate:coins:add',
    'donate:coins:deduct',
    'donate:shop:create',
    'donate:shop:update',
    'donate:shop:delete',
    'donate:purchase:refund',
    'donate:transaction:list',
    'donate:purchase:list',
    'donate:purchase:issue',
    'donate:wallet:read',
    'kit:assign',
    'kit:edit',
    'kit:list',
    'kit:read',
    'mail:compose',
    'mail:read',
    'hungergames:match:record',
    'hungergames:season:reset',
    'hungergames:season:create',
    'players:nickname:write',
    'players:nickname:grant',
    'news:create',
    'news:delete',
    'offline_access',
    'wiki:write',
    'wiki:review',
    'tickets:manage',
];