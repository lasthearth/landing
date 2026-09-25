import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Одна горизонталь рельефа.
 * Используется только внутри компонента сцены.
 */
interface SceneContour {
    /**
     * SVG-путь горизонтали: разомкнутая линия через всю карту.
     */
    d: string;

    /**
     * Утолщённая горизонталь: каждая пятая, как на топографических картах.
     */
    major: boolean;
}

/**
 * Роза ветров с лучами румбов и градусной шкалой.
 * Используется только внутри компонента сцены.
 */
interface SceneRose {
    /**
     * Центр розы по X.
     */
    x: number;

    /**
     * Центр розы по Y.
     */
    y: number;

    /**
     * Радиус розы.
     */
    r: number;

    /**
     * Углы 32 румбов в градусах. Лучи в шаблоне рисуются отрезками
     * фиксированной длины, повёрнутыми на эти углы.
     */
    rayAngles: number[];

    /**
     * Лучи восьмиконечной звезды розы.
     */
    star: string;

    /**
     * Штрихи градусной шкалы.
     */
    ticks: string;
}

/**
 * Ширина сцены в единицах viewBox.
 */
const SCENE_WIDTH = 1920;

/**
 * Высота сцены в единицах viewBox.
 */
const SCENE_HEIGHT = 1080;

/**
 * Фон сайта: старинная карта-портолан на inline-SVG.
 *
 * Бледные горизонтали рельефа, роза ветров с лучами румбов и градусная
 * сетка. Движение намеренно почти незаметное: горизонтали один раз
 * прорисовываются «пером» при загрузке, затем медленно дрейфуют,
 * а шкала розы вращается.
 *
 * Горизонтали разомкнутые: замкнутые кольца читались как случайные
 * овалы-рамки поверх контента. Формы строятся из синусоид с фазами,
 * выведенными из номера линии, поэтому SSR и браузер рисуют одинаковую
 * картинку без генератора случайных чисел.
 */
@Component({
    standalone: true,
    selector: 'app-background-scene',
    templateUrl: './background-scene.component.html',
    styleUrl: './background-scene.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundSceneComponent {
    /**
     * viewBox корневого SVG.
     */
    protected readonly viewBox = `0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`;

    /**
     * Горизонтали рельефа: разомкнутые линии через всю карту.
     */
    protected readonly contours: SceneContour[] = this.generateRelief();

    /**
     * Роза ветров.
     */
    protected readonly roses: SceneRose[] = [this.generateRose(1640, 250, 92)];

    /**
     * Градусная сетка: вертикальные линии меридианов.
     * Отступ от кромки в 160 единиц: линия ровно на краю вьюпорта
     * при slice читается как рамка, потому что маска гасит только центр.
     */
    protected readonly meridians: number[] = Array.from({ length: 11 }, (_, index) => 160 + index * 160);

    /**
     * Градусная сетка: горизонтальные линии параллелей.
     */
    protected readonly parallels: number[] = Array.from({ length: 6 }, (_, index) => 160 + index * 160);

    /**
     * Строит горизонтали рельефа: волнистые линии через всю ширину карты,
     * каждая пятая утолщена, как на топографических картах.
     *
     * @returns Горизонтали сверху вниз.
     */
    private generateRelief(): SceneContour[] {
        const lines = 13;
        const spacing = 74;
        const step = 32;

        return Array.from({ length: lines }, (_, index) => {
            const baseY = 96 + index * spacing;
            const points: string[] = [];

            for (let x = -step; x <= SCENE_WIDTH + step; x += step) {
                const t = (x / SCENE_WIDTH) * Math.PI * 2;
                const y =
                    baseY +
                    Math.sin(t * (2 + (index % 3)) + index * 1.7) * (16 + (index % 4) * 7) +
                    Math.sin(t * 5 + index * 0.9) * 8 +
                    Math.sin(t * 11 + index * 2.3) * 3.5;
                points.push(`${x},${Math.round(y)}`);
            }

            return { d: `M${points.join(' L')}`, major: index % 5 === 0 };
        });
    }

    /**
     * Строит розу ветров: 32 румба, восьмиконечную звезду и градусную шкалу.
     * Координаты звезды и шкалы — относительно центра розы.
     *
     * @param x Центр по X.
     * @param y Центр по Y.
     * @param r Радиус розы.
     * @returns Роза ветров.
     */
    private generateRose(x: number, y: number, r: number): SceneRose {
        const rayAngles = Array.from({ length: 32 }, (_, index) => Math.round((index / 32) * 360));

        // Восемь лучей: длинные — стороны света, короткие — промежуточные ветра.
        const star = Array.from({ length: 16 }, (_, index) => {
            const angle = (index / 16) * Math.PI * 2 - Math.PI / 2;
            const len = index % 2 === 1 ? r * 0.16 : index % 4 === 0 ? r : r * 0.58;

            return `${(Math.cos(angle) * len).toFixed(1)},${(Math.sin(angle) * len).toFixed(1)}`;
        }).join(' ');

        const ticks = Array.from({ length: 72 }, (_, index) => {
            const angle = (index / 72) * Math.PI * 2;
            const inner = r * (index % 6 === 0 ? 1.1 : 1.16);
            const outer = r * 1.22;

            return `M${(Math.cos(angle) * inner).toFixed(1)},${(Math.sin(angle) * inner).toFixed(1)} L${(Math.cos(angle) * outer).toFixed(1)},${(Math.sin(angle) * outer).toFixed(1)}`;
        }).join(' ');

        return { x, y, r, rayAngles, star, ticks };
    }
}
