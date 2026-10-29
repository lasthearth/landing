/**
 * Вид карты: какую точку мира показываем в центре и в каком масштабе.
 *
 * Координаты мира — блоки (x на восток, z на юг), экран — пиксели.
 * Метки и подписи рисуются в пикселях, поэтому не растут при приближении.
 */
export interface MapView {
    /** X мира в центре экрана. */
    cx: number;
    /** Z мира в центре экрана. */
    cz: number;
    /** Пикселей на блок. */
    scale: number;
}

/**
 * Размер области карты в пикселях.
 */
export interface MapSize {
    width: number;
    height: number;
}

/**
 * Точка мира в плоскости карты.
 */
export interface MapPoint {
    x: number;
    z: number;
}

/**
 * Точка на экране.
 */
export interface ScreenPoint {
    x: number;
    y: number;
}

/** Самый мелкий масштаб: 1 пиксель — 250 блоков, весь мир сервера помещается. */
export const MIN_SCALE = 0.004;

/** Самый крупный масштаб: 1 пиксель — 2 блока, видно окрестности наделы. */
export const MAX_SCALE = 0.5;

/** Самый крупный масштаб при «Показать всё»: одно надел рядом с Очагом не раздувается на весь экран. */
const MAX_FIT_SCALE = 0.12;

/** Размах, который карта показывает, даже если наделов нет или они все у Очага. */
const MIN_FIT_SPAN = 2000;

/** Шаги сетки в блоках: из них выбирается тот, что даёт удобное расстояние между линиями. */
const GRID_STEPS = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];

/**
 * Ограничивает масштаб допустимыми пределами.
 *
 * @param scale Пикселей на блок.
 * @returns Масштаб в пределах MIN_SCALE…MAX_SCALE.
 */
export function clampScale(scale: number): number {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Переводит точку мира в пиксели экрана.
 *
 * @param view Вид карты.
 * @param size Размер области.
 * @param point Точка мира.
 * @returns Точка на экране.
 */
export function worldToScreen(view: MapView, size: MapSize, point: MapPoint): ScreenPoint {
    return {
        x: (point.x - view.cx) * view.scale + size.width / 2,
        y: (point.z - view.cz) * view.scale + size.height / 2,
    };
}

/**
 * Переводит пиксели экрана в точку мира.
 *
 * @param view Вид карты.
 * @param size Размер области.
 * @param point Точка на экране.
 * @returns Точка мира.
 */
export function screenToWorld(view: MapView, size: MapSize, point: ScreenPoint): MapPoint {
    return {
        x: (point.x - size.width / 2) / view.scale + view.cx,
        z: (point.y - size.height / 2) / view.scale + view.cz,
    };
}

/**
 * Меняет масштаб так, чтобы точка под курсором осталась на месте.
 *
 * @param view Вид карты.
 * @param size Размер области.
 * @param anchor Точка экрана, вокруг которой меняется масштаб.
 * @param factor Во сколько раз приблизить (меньше 1 — отдалить).
 * @returns Новый вид.
 */
export function zoomAt(view: MapView, size: MapSize, anchor: ScreenPoint, factor: number): MapView {
    const scale = clampScale(view.scale * factor);
    const world = screenToWorld(view, size, anchor);

    return {
        scale,
        cx: world.x - (anchor.x - size.width / 2) / scale,
        cz: world.z - (anchor.y - size.height / 2) / scale,
    };
}

/**
 * Сдвигает карту вслед за пальцем или мышью.
 *
 * @param view Вид карты.
 * @param dx Сдвиг по экрану вправо, пиксели.
 * @param dy Сдвиг по экрану вниз, пиксели.
 * @returns Новый вид.
 */
export function panBy(view: MapView, dx: number, dy: number): MapView {
    return { ...view, cx: view.cx - dx / view.scale, cz: view.cz - dy / view.scale };
}

/**
 * Вид, в который помещаются все точки и Очаг.
 *
 * @param points Точки мира.
 * @param size Размер области.
 * @param padding Отступ от краёв, пиксели.
 * @returns Вид «Показать всё».
 */
export function fitView(points: readonly MapPoint[], size: MapSize, padding: number): MapView {
    const all = [{ x: 0, z: 0 }, ...points];
    const xs = all.map((point) => point.x);
    const zs = all.map((point) => point.z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const spanX = Math.max(maxX - minX, MIN_FIT_SPAN);
    const spanZ = Math.max(maxZ - minZ, MIN_FIT_SPAN);
    const width = Math.max(size.width - padding * 2, 1);
    const height = Math.max(size.height - padding * 2, 1);
    const scale = clampScale(Math.min(width / spanX, height / spanZ, MAX_FIT_SCALE));

    return { scale, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}

/**
 * Шаг сетки в блоках для текущего масштаба.
 *
 * @param scale Пикселей на блок.
 * @param minPx Наименьшее расстояние между линиями на экране.
 * @returns Шаг сетки в блоках.
 */
export function gridStep(scale: number, minPx = 90): number {
    return GRID_STEPS.find((step) => step * scale >= minPx) ?? GRID_STEPS[GRID_STEPS.length - 1];
}

/**
 * Значения линий сетки, попадающих на экран.
 *
 * @param view Вид карты.
 * @param size Размер области.
 * @param step Шаг сетки в блоках.
 * @returns Координаты вертикальных (x) и горизонтальных (z) линий.
 */
export function gridLines(view: MapView, size: MapSize, step: number): { xs: number[]; zs: number[] } {
    const topLeft = screenToWorld(view, size, { x: 0, y: 0 });
    const bottomRight = screenToWorld(view, size, { x: size.width, y: size.height });

    return {
        xs: range(Math.ceil(topLeft.x / step) * step, bottomRight.x, step),
        zs: range(Math.ceil(topLeft.z / step) * step, bottomRight.z, step),
    };
}

/**
 * Числа от from до to с шагом step (не больше 200, чтобы сбой масштаба не повесил страницу).
 */
function range(from: number, to: number, step: number): number[] {
    const values: number[] = [];

    for (let value = from; value <= to && values.length < 200; value += step) {
        values.push(value);
    }

    return values;
}
