import { ISeoData } from '@core/types/i-seo-data';

/**
 * Базовый домен сайта.
 */
const siteUrl = 'https://lasthearth.ru';

/**
 * Общее изображение для Open Graph и Twitter Cards.
 */
const ogImage = `${siteUrl}/og-image.jpg`;

/**
 * Общее название сайта.
 */
const siteName = 'Last Hearth — ролевой сервер Vintage Story';

/**
 * SEO-данные для страниц приложения.
 */
export const routeSeoData: {
    home: ISeoData;
    rules: ISeoData;
    faq: ISeoData;
    market: ISeoData;
    settlements: ISeoData;
    startGame: ISeoData;
    privacyPolicy: ISeoData;
    publicOffer: ISeoData;
    profile: ISeoData;
    notFound: ISeoData;
    gallery: ISeoData;
    videos: ISeoData;
    diplomacy: ISeoData;
    news: ISeoData;
    events: ISeoData;
    player: ISeoData;
    lfg: ISeoData;
    newsList: ISeoData;
    join: ISeoData;
    wiki: ISeoData;
    wikiArticle: ISeoData;
    wikiSection: ISeoData;
    mods: ISeoData;
    worldMap: ISeoData;
    about: ISeoData;
    keyPoints: ISeoData;
    players: ISeoData;
} = {
    home: {
        title: 'Last Hearth — ролевой сервер Vintage Story',
        description:
            'Last Hearth — уникальный ролевой политико-экономический сервер Vintage Story. Развивайте поселения, ведите войны, заключайте союзы и участвуйте в жизни Империи. Хардкор, PvP, дипломатия и собственные моды.',
        url: `${siteUrl}/`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Last Hearth — ролевой сервер Vintage Story',
    },
    rules: {
        title: 'Правила сервера Last Hearth',
        description:
            'Полные правила игрового сервера Last Hearth: PvP, поселения, войны, торговля, наказания. Ознакомьтесь перед началом игры.',
        url: `${siteUrl}/rules`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Правила сервера Last Hearth',
    },
    faq: {
        title: 'FAQ — частые вопросы о Last Hearth',
        description:
            'Ответы на частые вопросы о сервере Last Hearth: как начать играть, вайпы, верификация, технические проблемы, модификации.',
        url: `${siteUrl}/faq`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Частые вопросы о сервере Last Hearth',
    },
    market: {
        title: 'Магазин привилегий Last Hearth',
        description:
            'Магазин игровых привилегий, наборов и особых предметов сервера Last Hearth. Пополняйте баланс осколков и покупайте преимущества.',
        url: `${siteUrl}/market`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Магазин привилегий Last Hearth',
    },
    settlements: {
        title: 'Поселения Last Hearth',
        description:
            'Список игровых поселений сервера Last Hearth: города, форты, замки, их жители, дипломатия и онлайн. Найдите союзников или создайте своё поселение.',
        url: `${siteUrl}/settlements`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Поселения сервера Last Hearth',
    },
    startGame: {
        title: 'Как начать играть на Last Hearth',
        description:
            'Пошаговая инструкция по началу игры на сервере Last Hearth: установка Vintage Story, регистрация, верификация и подключение.',
        url: `${siteUrl}/start-game`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Как начать играть на Last Hearth',
    },
    privacyPolicy: {
        title: 'Политика конфиденциальности Last Hearth',
        description: 'Политика конфиденциальности проекта Last Hearth.',
        url: `${siteUrl}/privacy-policy`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        robots: 'noindex, follow',
    },
    publicOffer: {
        title: 'Публичная оферта Last Hearth',
        description: 'Публичная оферта проекта Last Hearth.',
        url: `${siteUrl}/public-offer`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        robots: 'noindex, follow',
    },
    profile: {
        title: 'Личный кабинет Last Hearth',
        description:
            'Личный кабинет игрока Last Hearth: профиль, статистика, поселение, баланс, верификация и магазин.',
        url: `${siteUrl}/profile`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        robots: 'noindex, nofollow',
    },
    notFound: {
        title: 'Страница не найдена — Last Hearth',
        description: 'Запрашиваемая страница не найдена. Вернитесь на главную Last Hearth.',
        url: siteUrl,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        robots: 'noindex, follow',
    },
    gallery: {
        title: 'Галерея скриншотов — Last Hearth',
        description:
            'Скриншоты игроков Last Hearth: постройки, события, битвы и живописные виды мира Vintage Story.',
        url: `${siteUrl}/gallery`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Галерея скриншотов Last Hearth',
    },
    videos: {
        title: 'Видео — Last Hearth',
        description:
            'Видеоролики с YouTube-канала Last Hearth: летсплеи, события, обзоры мира Vintage Story.',
        url: `${siteUrl}/videos`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Видео Last Hearth',
    },
    newsList: {
        title: 'Новости — Last Hearth',
        description:
            'Все новости ролевого сервера Last Hearth: обновления, события, войны и жизнь поселений Vintage Story.',
        url: `${siteUrl}/news`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Новости Last Hearth',
    },
    news: {
        title: 'Новости — Last Hearth',
        description:
            'Новости ролевого сервера Last Hearth: обновления, события, войны и жизнь поселений Vintage Story.',
        url: `${siteUrl}/home`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Новости Last Hearth',
    },
    diplomacy: {
        title: 'Дипломатия — Last Hearth',
        description:
            'Заявления глав селений и дипломатические обращения сервера Last Hearth.',
        url: `${siteUrl}/diplomacy`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Дипломатия Last Hearth',
    },
    events: {
        title: 'События — Last Hearth',
        description:
            'Календарь событий сервера Last Hearth: осады, ярмарки, турниры и вайпы. Добавляйте события в свой календарь.',
        url: `${siteUrl}/events`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'События Last Hearth',
    },
    player: {
        title: 'Игрок — Last Hearth',
        description: 'Профиль игрока сервера Last Hearth: поселение, статистика и значки.',
        url: `${siteUrl}/player`,
        type: 'profile',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Игрок Last Hearth',
        robots: 'noindex, follow',
    },
    players: {
        title: 'Игроки — Last Hearth',
        description:
            'Все игроки сервера Last Hearth: поиск по нику, кто был в игре недавно, поселения и описания.',
        url: `${siteUrl}/players`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Игроки сервера Last Hearth',
    },
    lfg: {
        title: 'Ищу компанию — Last Hearth',
        description:
            'Доска «Ищу компанию» сервера Last Hearth: найдите напарника для постоянной игры или соберите отряд в шахту, поход и на стройку прямо сейчас.',
        url: `${siteUrl}/lfg`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Ищу компанию — Last Hearth',
    },
    wiki: {
        title: 'Вики — Last Hearth',
        description:
            'Справочник по миру Last Hearth: механики, начало игры, поселения, войны, экономика и помощь новичку.',
        url: `${siteUrl}/wiki`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Вики сервера Last Hearth',
    },
    mods: {
        title: 'Моды сервера Last Hearth',
        description:
            'Список модов сервера Last Hearth с версиями: что нужно установить, чтобы зайти на сервер, и что можно добавить по желанию.',
        url: `${siteUrl}/mods`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Моды сервера Last Hearth',
    },
    worldMap: {
        title: 'Карта земель — Last Hearth',
        description:
            'Карта поселений сервера Last Hearth: где стоят глашатаи поселений, как далеко они от Очага и какой у них курс.',
        url: `${siteUrl}/map`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Карта земель Last Hearth',
        // Пока на карте пример (бэкенд не отдаёт позиции глашатаев), страница
        // не индексируется. Убрать вместе с примером.
        robots: 'noindex, follow',
    },
    about: {
        title: 'О сервере Last Hearth',
        description:
            'Last Hearth — русскоязычный ролевой сервер Vintage Story: поселения от лагеря до провинции, дипломатия и войны по правилам, экономика, собственные моды, вики и события.',
        url: `${siteUrl}/about`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'О сервере Last Hearth',
    },
    keyPoints: {
        title: 'Ключевые точки и их прокачка — Last Hearth',
        description:
            'Схемы прокачки ключевых точек сервера Last Hearth: шахта, форт, воздушная гавань, промышленная и торговая точки — уровни, улучшения и стоимость.',
        url: `${siteUrl}/key-points`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Ключевые точки сервера Last Hearth',
    },
    wikiSection: {
        title: 'Раздел вики — Last Hearth',
        description: 'Раздел вики сервера Last Hearth: статьи по механике, поселениям, войнам и экономике.',
        url: `${siteUrl}/wiki`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Раздел вики сервера Last Hearth',
    },
    wikiArticle: {
        title: 'Статья вики — Last Hearth',
        description: 'Статья вики сервера Last Hearth: механики, поселения, войны и экономика.',
        url: `${siteUrl}/wiki`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Статья вики Last Hearth',
    },
    join: {
        title: 'Приглашение в поселение — Last Hearth',
        description: 'Вас пригласили в поселение на сервере Last Hearth.',
        url: `${siteUrl}/join`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Приглашение в поселение Last Hearth',
        robots: 'noindex, nofollow',
    },
};
