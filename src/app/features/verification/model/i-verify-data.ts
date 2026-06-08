/**
 * Интерфейс данных для верификации пользователя.
 */
export interface IVerifyData {
    /**
     * Имя пользователя.
     */
    user_name: string;

    /**
     * Игровое имя пользователя.
     */
    user_game_name: string;

    /**
     * Контактные данные.
     */
    contacts: string;

    /**
     * Ответы на вопросы верификации.
     */
    answers: Array<{
        /**
         * Вопрос.
         */
        question: string;

        /**
         * Ответ.
         */
        answer: string;
    }>;
}
