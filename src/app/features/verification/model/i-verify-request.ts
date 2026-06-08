import { IVerifyData } from './i-verify-data';

/**
 * Интерфейс запроса на верификацию пользователя.
 * Расширяет {@link IVerifyData} идентификатором пользователя.
 */
export interface IVerifyRequest extends IVerifyData {
    /**
     * Идентификатор пользователя.
     */
    user_id: string;
}
