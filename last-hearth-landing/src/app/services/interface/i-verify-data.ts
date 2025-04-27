export interface IVerifyData {
    user_name: string;

    user_game_name: string;

    contacts: string;

    answers: Array<{
        question: string,
        answer: string
    }>
}
