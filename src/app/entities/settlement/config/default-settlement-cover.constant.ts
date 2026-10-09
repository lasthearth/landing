/**
 * Путь к изображению-заглушке для обложки поселения.
 * Используется как фолбэк, когда у поселения отсутствуют вложения (attachments пустой массив)
 * и невозможно uzyskaть URL первого изображения.
 */
export const DEFAULT_SETTLEMENT_COVER = '/landing-carousel/1.webp';