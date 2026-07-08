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
} = {
    home: {
        title: 'Last Hearth — ролевой сервер Vintage Story',
        description:
            'Last Hearth — уникальный ролевой политико-экономический сервер Vintage Story. Развивайте поселения, ведите войны, заключайте союзы и участвуйте в жизни Империи. Хардкор, PvP, дипломатия и собственные моды.',
        keywords:
            'Vintage Story сервер, Last Hearth, ролевой сервер VS, Vintage Story PvP, Vintage Story RP, сервер с поселениями, империя, осады, дипломатия, игровой сервер, Minecraft альтернатива',
        url: `${siteUrl}/home`,
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
        keywords:
            'правила Last Hearth, правила Vintage Story сервера, PvP правила, правила поселений, правила торговли',
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
        keywords:
            'FAQ Last Hearth, как играть Vintage Story, вайп Last Hearth, верификация, техническая поддержка',
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
        keywords:
            'магазин Last Hearth, привилегии Vintage Story, донат Last Hearth, наборы Vintage Story, осколки искры',
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
        keywords:
            'поселения Last Hearth, города Vintage Story, кланы Last Hearth, дипломатия, осады замков',
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
        keywords:
            'как начать играть Last Hearth, установить Vintage Story, подключиться к серверу, верификация',
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
        keywords: 'политика конфиденциальности, Last Hearth, обработка данных',
        url: `${siteUrl}/privacy-policy`,
        type: 'article',
        locale: 'ru_RU',
        siteName,
        robots: 'noindex, follow',
    },
    publicOffer: {
        title: 'Публичная оферта Last Hearth',
        description: 'Публичная оферта проекта Last Hearth.',
        keywords: 'публичная оферта, Last Hearth, условия покупки',
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
        keywords: 'личный кабинет Last Hearth, профиль игрока, статистика, баланс',
        url: `${siteUrl}/profile`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        robots: 'noindex, nofollow',
    },
    notFound: {
        title: 'Страница не найдена — Last Hearth',
        description: 'Запрашиваемая страница не найдена. Вернитесь на главную Last Hearth.',
        keywords: '',
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
        keywords:
            'скриншоты Last Hearth, галерея Vintage Story, постройки, события, скриншоты недели',
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
        keywords:
            'видео Last Hearth, YouTube Vintage Story, летсплей, игровые видео, Last Hearth канал',
        url: `${siteUrl}/videos`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Видео Last Hearth',
    },
    diplomacy: {
        title: 'Дипломатия — Last Hearth',
        description:
            'Заявления глав селений и дипломатические обращения сервера Last Hearth.',
        keywords:
            'дипломатия Last Hearth, заявления селений, политика Vintage Story, союзы, войны',
        url: `${siteUrl}/diplomacy`,
        type: 'website',
        locale: 'ru_RU',
        siteName,
        image: ogImage,
        imageAlt: 'Дипломатия Last Hearth',
    },
};
