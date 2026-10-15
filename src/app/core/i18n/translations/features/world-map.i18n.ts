/**
 * Переводы страницы «Карта земель».
 */
export const WORLD_MAP_I18N = {
    ru: {
        worldMap: {
            title: 'Карта земель',
            subtitle: 'Поселения там, где их главы поставили глашатая. В центре — Очаг, где появляются новички.',
            toList: 'Список поселений',
            demo: 'Пока на карте пример. Настоящие поселения появятся, когда их главы поставят блок-глашатай.',
            hearth: 'Очаг',
            blocks: '{{count}} блоков',
            types: {
                CAMP: 'Лагерь',
                VILLAGE: 'Деревня',
                TOWNSHIP: 'Посёлок',
                CITY: 'Город',
                PROVINCE: 'Провинция',
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
                members: 'Жителей',
                fromHearth: 'От Очага',
                herald: 'Глашатай стоит на',
                height: 'высота {{y}}',
                open: 'Страница поселения',
                demoNote: 'Это поселение из примера, страницы у него нет.',
            },
            legend: {
                title: 'Как читать карту',
                shape: 'Значок показывает тип поселения',
                ring: 'Цвет кольца показывает курс',
                hearth: 'Чем крупнее поселение, тем шире его свет. Координаты на краях — те же X и Z, что в игре.',
            },
            list: {
                title: 'Поселения на карте: {{count}}',
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
            subtitle: 'Settlements where their leaders placed a herald. The Hearth in the center is where newcomers spawn.',
            toList: 'Settlement list',
            demo: 'The map shows an example for now. Real settlements appear once their leaders place a herald block.',
            hearth: 'Hearth',
            blocks: '{{count}} blocks',
            types: {
                CAMP: 'Camp',
                VILLAGE: 'Village',
                TOWNSHIP: 'Township',
                CITY: 'City',
                PROVINCE: 'Province',
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
                members: 'Residents',
                fromHearth: 'From the Hearth',
                herald: 'Herald stands at',
                height: 'height {{y}}',
                open: 'Settlement page',
                demoNote: 'This settlement is part of the example and has no page.',
            },
            legend: {
                title: 'How to read the map',
                shape: 'The icon shows the settlement type',
                ring: 'The ring color shows the course',
                hearth: 'The bigger the settlement, the wider its light. Edge coordinates are the same X and Z as in the game.',
            },
            list: {
                title: 'Settlements on the map: {{count}}',
                members: 'residents: {{count}}',
            },
            empty: {
                title: 'No one on the map yet',
                description: 'A settlement appears here once its leader places a herald block.',
            },
        },
    },
};
