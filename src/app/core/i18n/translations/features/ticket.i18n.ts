/**
 * Переводы для формы обращения (тикета).
 */
export const TICKET_I18N = {
    ru: {
        ticket: {
            button: 'Тикет',
            title: 'Создать обращение',
            description:
                'Опишите свою проблему. Обращение будет отправлено в Discord администрации.',
            discordTagLabel: 'Тег Discord',
            discordTagPlaceholder: 'Например: username',
            gameNicknameLabel: 'Ник в игре',
            gameNicknamePlaceholder: 'Ваш игровой никнейм',
            reasonLabel: 'Причина обращения',
            reasonPlaceholder: 'Подробно опишите ситуацию...',
            dateLabel: 'Дата обращения',
            cancel: 'Отмена',
            submit: 'Отправить',
            success: 'Обращение успешно отправлено.',
            errors: {
                discordTagRequired: 'Укажите тег Discord',
                gameNicknameRequired: 'Укажите ник в игре',
                reasonRequired: 'Опишите причину обращения',
                reasonMinLength: 'Описание должно содержать не менее 20 символов',
            },
        },
    },
    en: {
        ticket: {
            button: 'Ticket',
            title: 'Create a ticket',
            description:
                'Describe your issue. The ticket will be sent to the administration via Discord.',
            discordTagLabel: 'Discord tag',
            discordTagPlaceholder: 'E.g. username',
            gameNicknameLabel: 'In-game nickname',
            gameNicknamePlaceholder: 'Your in-game nickname',
            reasonLabel: 'Reason for appeal',
            reasonPlaceholder: 'Describe the situation in detail...',
            dateLabel: 'Date of appeal',
            cancel: 'Cancel',
            submit: 'Submit',
            success: 'Ticket submitted successfully.',
            errors: {
                discordTagRequired: 'Please provide your Discord tag',
                gameNicknameRequired: 'Please provide your in-game nickname',
                reasonRequired: 'Please describe the reason for your appeal',
                reasonMinLength: 'Description must be at least 20 characters',
            },
        },
    },
};
