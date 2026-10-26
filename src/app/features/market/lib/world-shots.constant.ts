/**
 * Кадр мира Last Hearth в разделе «Поддержка сервера».
 */
export interface WorldShot {
    /**
     * Путь к изображению в `public`.
     */
    readonly image: string;

    /**
     * Ключ перевода альтернативного текста.
     */
    readonly altKey: string;
}

/**
 * Скриншоты мира сервера для раздела «Поддержка сервера».
 *
 * Кадры лежат в `public/landing-carousel` и используются также каруселью
 * главной страницы и разделами вики: это собственные изображения проекта,
 * а не заглушки. Все четыре кадрируются в шаблоне под одно соотношение.
 */
export const WORLD_SHOTS: readonly WorldShot[] = [
    { image: '/landing-carousel/1.webp', altKey: 'market.marketPage.worldShotHouse' },
    { image: '/landing-carousel/2.webp', altKey: 'market.marketPage.worldShotVillage' },
    { image: '/landing-carousel/3.webp', altKey: 'market.marketPage.worldShotSiege' },
    { image: '/landing-carousel/7.webp', altKey: 'market.marketPage.worldShotMill' },
];
