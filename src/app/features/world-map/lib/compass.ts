/**
 * Сторона света от Очага.
 */
export type CompassDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

/** Ближе этого расстояния поселение считается стоящим у Очага: сторона света теряет смысл. */
const NEAR_HEARTH = 100;

/** Стороны света против часовой стрелки от востока, по 45°. */
const DIRECTIONS: readonly CompassDirection[] = ['e', 'ne', 'n', 'nw', 'w', 'sw', 's', 'se'];

/**
 * Расстояние от Очага по прямой, в блоках.
 *
 * @param x Координата X.
 * @param z Координата Z.
 * @returns Расстояние, округлённое до блока.
 */
export function distanceFromHearth(x: number, z: number): number {
    return Math.round(Math.hypot(x, z));
}

/**
 * В какую сторону от Очага идти к точке.
 *
 * В игре север — это отрицательная Z, восток — положительная X.
 *
 * @param x Координата X.
 * @param z Координата Z.
 * @returns Сторона света или null, если точка у самого Очага.
 */
export function compassDirection(x: number, z: number): CompassDirection | null {
    if (Math.hypot(x, z) < NEAR_HEARTH) {
        return null;
    }

    const degrees = (Math.atan2(-z, x) * 180) / Math.PI;
    const index = (Math.round(degrees / 45) + 8) % 8;

    return DIRECTIONS[index];
}

/**
 * Расстояние для подписи: до десятков блоков, точнее в игре всё равно не нужно.
 *
 * @param blocks Расстояние в блоках.
 * @returns Округлённое расстояние.
 */
export function roundDistance(blocks: number): number {
    return Math.round(blocks / 10) * 10;
}
