import { IMember } from '@entities/settlement';
import { IRole } from './i-role';

export interface ISettlement {
    id: string;

    type: string | number;

    name: string;

    description: string;

    /**
     * @deprecated Не использовать. Лидеры теперь вычисляются из `members[].role_ids`,
     * содержащих `"owner"`. Оставлено для обратной совместимости со старыми ответами.
     */
    leader?: IMember;

    members: IMember[];

    /**
     * Справочник ролей надела.
     */
    roles?: IRole[];

    /**
     * Включена ли система ролей. При `false` роли скрыты и не применяются, остаётся только owner.
     */
    roles_enabled?: boolean;

    /**
     * Контактная информация надела (≤512, без `<`/`>`).
     * ВНИМАНИЕ (XSS): сервер хранит текст как есть, выводить только через интерполяцию `{{ }}`.
     */
    contact_info?: string;

    diplomacy: string;

    coordinates: {
        x: number;
        y: number;
    };

    /**
     * Где стоит блок-глашатай надела (x, z — по карте, y — высота).
     * Позицию пишет сервер, когда глашатая ставят в игре. Приходит только в ответе
     * на одно надел (`GET /settlements/{id}`), в списке её нет; у гильдии нет никогда.
     * Для карты все позиции разом — `getNotifierPositions$()` (`GET /settlements/notifiers`).
     */
    notifier_position?: {
        x?: number;
        y?: number;
        z?: number;
    };

    tags: [
        {
            id: string;
        },
    ];

    attachments: {
        url: string;

        desc: string;
    }[];

    created_at: string;

    updated_at: string;
}
