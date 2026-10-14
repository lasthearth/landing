/**
 * Переводы страницы «Игроки» и карточек игроков.
 */
export const PLAYERS_I18N = {
    ru: {
        players: {
            title: 'Игроки',
            subtitle: 'Все, кто играет на Last Hearth. Ищите по нику и смотрите, кто был в игре недавно.',
            search: 'Найти по нику',
            searchLabel: 'Поиск по нику',
            sort: {
                label: 'Сначала',
                seen: 'недавно в игре',
                hours: 'больше часов',
                name: 'по нику',
            },
            seen: {
                label: 'Был в игре:',
                all: 'Все',
                online: 'Сейчас в игре',
                day: 'За сутки',
                week: 'За неделю',
                month: 'За месяц',
                inactive: 'Больше месяца назад',
            },
            status: {
                online: 'Сейчас в игре',
                lastSeen: 'Был в игре',
                offline: 'Не в игре',
            },
            role: {
                leader: 'Глава',
                resident: 'Житель',
            },
            found: 'Игроков: {{count}}',
            pageOf: 'страница {{page}} из {{pages}}',
            reset: 'Сбросить фильтры',
            empty: 'Никого не нашли',
            emptyHint: 'Проверьте ник или выберите другой период.',
            noAbout: 'Пока ничего о себе не рассказал',
            noSettlement: 'Без поселения',
            hours: '{{count}} ч в игре',
            loadError: 'Не удалось загрузить игроков',
        },
    },
    en: {
        players: {
            title: 'Players',
            subtitle: 'Everyone who plays on Last Hearth. Search by nickname and see who was in the game recently.',
            search: 'Find by nickname',
            searchLabel: 'Search by nickname',
            sort: {
                label: 'Sort by',
                seen: 'recently in game',
                hours: 'most hours',
                name: 'nickname',
            },
            seen: {
                label: 'In game:',
                all: 'All',
                online: 'Now',
                day: 'Last 24 hours',
                week: 'Last week',
                month: 'Last month',
                inactive: 'Over a month ago',
            },
            status: {
                online: 'In game now',
                lastSeen: 'Last seen',
                offline: 'Not in game',
            },
            role: {
                leader: 'Leader of',
                resident: 'Resident of',
            },
            found: 'Players: {{count}}',
            pageOf: 'page {{page}} of {{pages}}',
            reset: 'Reset filters',
            empty: 'No one found',
            emptyHint: 'Check the nickname or pick another period.',
            noAbout: 'Hasn’t written anything yet',
            noSettlement: 'No settlement',
            hours: '{{count}} h in game',
            loadError: 'Could not load players',
        },
    },
};
