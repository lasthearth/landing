import { compassDirection, distanceFromHearth, roundDistance } from './compass';
import { MAX_SCALE, MIN_SCALE, fitView, gridLines, gridStep, panBy, screenToWorld, worldToScreen, zoomAt } from './map-view';
import { placeLabels } from './place-labels';
import { settlementCourse } from './settlement-mark';

describe('world-map lib', () => {
    const size = { width: 800, height: 600 };

    describe('compass', () => {
        it('считает север отрицательной Z, восток — положительной X', () => {
            expect(compassDirection(0, -1000)).toBe('n');
            expect(compassDirection(1000, 0)).toBe('e');
            expect(compassDirection(0, 1000)).toBe('s');
            expect(compassDirection(-1000, 0)).toBe('w');
            expect(compassDirection(1000, -1000)).toBe('ne');
            expect(compassDirection(-780, 1520)).toBe('sw');
        });

        it('у самого Очага сторону света не называет', () => {
            expect(compassDirection(30, -40)).toBeNull();
        });

        it('округляет расстояние до десятков блоков', () => {
            expect(distanceFromHearth(300, 400)).toBe(500);
            expect(roundDistance(1708)).toBe(1710);
        });
    });

    describe('map view', () => {
        it('переводит мир в экран и обратно без потерь', () => {
            const view = { cx: 120, cz: -40, scale: 0.05 };
            const screen = worldToScreen(view, size, { x: 1000, z: 500 });
            const world = screenToWorld(view, size, screen);

            expect(world.x).toBeCloseTo(1000);
            expect(world.z).toBeCloseTo(500);
        });

        it('при приближении точка под курсором остаётся на месте', () => {
            const view = { cx: 0, cz: 0, scale: 0.05 };
            const anchor = { x: 650, y: 120 };
            const before = screenToWorld(view, size, anchor);
            const after = screenToWorld(zoomAt(view, size, anchor, 2), size, anchor);

            expect(after.x).toBeCloseTo(before.x);
            expect(after.z).toBeCloseTo(before.z);
        });

        it('не выходит за пределы масштаба', () => {
            const view = { cx: 0, cz: 0, scale: 0.05 };

            expect(zoomAt(view, size, { x: 0, y: 0 }, 1000).scale).toBe(MAX_SCALE);
            expect(zoomAt(view, size, { x: 0, y: 0 }, 0.00001).scale).toBe(MIN_SCALE);
        });

        it('сдвиг тянет карту вслед за пальцем', () => {
            const moved = panBy({ cx: 0, cz: 0, scale: 0.1 }, 50, -20);

            expect(moved.cx).toBeCloseTo(-500);
            expect(moved.cz).toBeCloseTo(200);
        });

        it('«Показать всё» вмещает все точки и Очаг', () => {
            const points = [
                { x: -3620, z: 2950 },
                { x: 3880, z: 3410 },
                { x: -1450, z: -2380 },
            ];
            const view = fitView(points, size, 40);

            for (const point of [...points, { x: 0, z: 0 }]) {
                const screen = worldToScreen(view, size, point);

                expect(screen.x).toBeGreaterThanOrEqual(39);
                expect(screen.x).toBeLessThanOrEqual(size.width - 39);
                expect(screen.y).toBeGreaterThanOrEqual(39);
                expect(screen.y).toBeLessThanOrEqual(size.height - 39);
            }
        });

        it('без поселений показывает окрестности Очага, а не весь мир в точку', () => {
            const view = fitView([], size, 40);

            expect(view.cx).toBe(0);
            expect(view.cz).toBe(0);
            expect(view.scale).toBeLessThanOrEqual(0.12);
        });

        it('выбирает шаг сетки не мельче 90 пикселей', () => {
            expect(gridStep(0.1)).toBe(1000);
            expect(gridStep(0.4)).toBe(250);
        });

        it('линии сетки кратны шагу и лежат на экране', () => {
            const view = { cx: 0, cz: 0, scale: 0.1 };
            const lines = gridLines(view, size, 1000);

            expect(lines.xs).toEqual([-4000, -3000, -2000, -1000, 0, 1000, 2000, 3000, 4000]);
            expect(lines.zs).toEqual([-3000, -2000, -1000, 0, 1000, 2000, 3000]);
        });
    });

    describe('labels', () => {
        it('крупное поселение подписывается первым, мелкое ищет другое место или скрывается', () => {
            const chosen = placeLabels([
                { id: 'camp', positions: [{ x: 10, y: 10 }], width: 100, height: 20, priority: 1 },
                { id: 'city', positions: [{ x: 50, y: 15 }], width: 100, height: 20, priority: 30 },
                { id: 'village', positions: [{ x: 60, y: 12 }, { x: 300, y: 12 }], width: 100, height: 20, priority: 5 },
            ]);

            expect(chosen.get('city')?.x).toBe(50);
            expect(chosen.get('village')?.x).toBe(300);
            expect(chosen.has('camp')).toBeFalse();
        });

        it('подпись не ложится на чужой знак, но стоит вплотную к своему', () => {
            const chosen = placeLabels(
                [
                    { id: 'own', positions: [{ x: 116, y: 90 }], width: 80, height: 20, priority: 1 },
                    { id: 'blocked', positions: [{ x: 300, y: 90 }], width: 80, height: 20, priority: 1 },
                ],
                [
                    { x: 85, y: 85, width: 30, height: 30 },
                    { x: 340, y: 85, width: 30, height: 30 },
                ]
            );

            expect([...chosen.keys()]).toEqual(['own']);
        });
    });

    describe('course', () => {
        it('совпадает с бейджем дипломатии в списке поселений', () => {
            expect(settlementCourse('Миролюбивый')).toBe('peace');
            expect(settlementCourse('Нейтральный')).toBe('neutral');
            expect(settlementCourse('Агрессивный')).toBe('danger');
        });

        it('у хутора курса нет', () => {
            expect(settlementCourse(undefined)).toBe('none');
        });
    });
});
