import { Observable } from 'rxjs';
import { ISettlement } from '@entities/settlement';

/**
 * Входные данные диалога управления ролями участника.
 */
export interface MemberRolesDialogData {
    /**
     * Поселение — источник справочника ролей и текущих ролей участника.
     */
    settlement: ISettlement;

    /**
     * Идентификатор участника, чьи роли редактируются.
     */
    userId: string;

    /**
     * Игровое имя участника для заголовка диалога.
     */
    memberName: string;

    /**
     * Выдаёт или снимает роль участнику.
     *
     * Запрос выполняет вызывающий компонент: он владеет состоянием страницы
     * и перерисовывает её из того же ответа.
     *
     * @param roleId Идентификатор роли.
     * @param granted Целевое состояние: `true` — выдать, `false` — снять.
     * @returns Observable с обновлённым поселением.
     */
    toggle: (roleId: string, granted: boolean) => Observable<ISettlement>;
}
