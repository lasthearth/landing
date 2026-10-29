/**
 * Переводы страницы «Карта земель».
 */
export const WORLD_MAP_I18N = {
    ru: {
        worldMap: {
            title: 'Карта земель',
            subtitle:
                'Поселения, хутора и ключевые точки там, где стоят их глашатаи. В центре — Очаг, где появляются новички.',
            toList: 'Список поселений',
            demo: 'Пока на карте пример. Настоящие поселения появятся, когда их главы поставят блок-глашатай.',
            hearth: 'Очаг',
            blocks: '{{count}} блоков',
            types: {
                HAMLET: 'Хутор',
                CAMP: 'Лагерь',
                VILLAGE: 'Деревня',
                TOWNSHIP: 'Посёлок',
                CITY: 'Город',
                PROVINCE: 'Провинция',
                KEY_POINT: 'Ключевая точка',
            },
            course: {
                peace: 'миролюбивый курс',
                neutral: 'нейтральный курс',
                danger: 'агрессивный курс',
            },
            direction: {
                n: 'к северу',
                ne: 'к северо-востоку',
                e: 'к востоку',
                se: 'к юго-востоку',
                s: 'к югу',
                sw: 'к юго-западу',
                w: 'к западу',
                nw: 'к северо-западу',
            },
            compass: {
                n: 'С',
            },
            canvas: {
                label: 'Карта поселений',
                keys: 'Стрелки двигают карту, плюс и минус меняют масштаб, ноль показывает все поселения.',
                zoomIn: 'Приблизить',
                zoomOut: 'Отдалить',
                fit: 'Показать все поселения',
                scale: '{{blocks}} блоков',
                wheelHint: 'Чтобы менять масштаб, крутите колёсико с зажатым Ctrl',
            },
            card: {
                close: 'Закрыть',
                owner: 'Хозяин',
                members: 'Жителей',
                fromHearth: 'От Очага',
                herald: 'Глашатай стоит на',
                height: 'высота {{y}}',
                open: 'Страница поселения',
                demoNote: 'Это поселение из примера, страницы у него нет.',
                keyPointNote: 'Ключевая точка — ею владеет поселение, которое её захватило и удерживает.',
                keyPoints: 'Как прокачать ключевые точки',
                hamletNote: 'Хутора не регистрируют на сайте: он на карте, потому что хозяин поставил глашатая.',
            },
            legend: {
                title: 'Условные знаки',
                types: 'Типы поселений',
                courses: 'Курс поселения',
            },
            list: {
                title: 'Указатель поселений',
                hint: 'От ближних к Очагу до дальних. Нажмите, чтобы найти на карте.',
                members: 'жителей: {{count}}',
            },
            empty: {
                title: 'На карте пока никого',
                description: 'Поселение появится здесь, когда его глава поставит блок-глашатай.',
            },
        },
    },
    en: {
        worldMap: {
            title: 'Map of the lands',
            subtitle:
                'Settlements, homesteads and key points where their heralds stand. The Hearth in the center is where newcomers spawn.',
            toList: 'Settlement list',
            demo: 'The map shows an example for now. Real settlements appear once their leaders place a herald block.',
            hearth: 'Hearth',
            blocks: '{{count}} blocks',
            types: {
                HAMLET: 'Homestead',
                CAMP: 'Camp',
                VILLAGE: 'Village',
                TOWNSHIP: 'Township',
                CITY: 'City',
                PROVINCE: 'Province',
                KEY_POINT: 'Key point',
            },
            course: {
                peace: 'peaceful course',
                neutral: 'neutral course',
                danger: 'aggressive course',
            },
            direction: {
                n: 'north',
                ne: 'north-east',
                e: 'east',
                se: 'south-east',
                s: 'south',
                sw: 'south-west',
                w: 'west',
                nw: 'north-west',
            },
            compass: {
                n: 'N',
            },
            canvas: {
                label: 'Settlement map',
                keys: 'Arrow keys move the map, plus and minus zoom, zero shows all settlements.',
                zoomIn: 'Zoom in',
                zoomOut: 'Zoom out',
                fit: 'Show all settlements',
                scale: '{{blocks}} blocks',
                wheelHint: 'Hold Ctrl and scroll to zoom',
            },
            card: {
                close: 'Close',
                owner: 'Owner',
                members: 'Residents',
                fromHearth: 'From the Hearth',
                herald: 'Herald stands at',
                height: 'height {{y}}',
                open: 'Settlement page',
                demoNote: 'This settlement is part of the example and has no page.',
                keyPointNote: 'A key point — it belongs to the settlement that captured and holds it.',
                keyPoints: 'How to upgrade key points',
                hamletNote:
                    'Homesteads are not registered on the site: this one is on the map because its owner placed a herald.',
            },
            legend: {
                title: 'Map key',
                types: 'Settlement types',
                courses: 'Settlement course',
            },
            list: {
                title: 'Settlement index',
                hint: 'From nearest to the Hearth to farthest. Select one to find it on the map.',
                members: 'residents: {{count}}',
            },
            empty: {
                title: 'No one on the map yet',
                description: 'A settlement appears here once its leader places a herald block.',
            },
        },
    },
};
