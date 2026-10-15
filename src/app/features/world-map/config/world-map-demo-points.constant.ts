import { WorldMapPoint } from '../model/world-map-point.interface';

/**
 * Пример поселений для карты, пока бэкенд не отдаёт позиции глашатаев.
 *
 * Названия и места выдуманы: настоящие поселения ещё не поставили глашатаев,
 * а подставлять их в чужие координаты значило бы показать неправду.
 * Разброс — как на реальном сервере: от пары сотен до четырёх тысяч блоков
 * от Очага во все стороны, разные типы и курсы.
 */
export const WORLD_MAP_DEMO_POINTS: readonly WorldMapPoint[] = [
    {
        id: 'demo-zlatograd',
        name: 'Златоград',
        type: 'CITY',
        diplomacy: 'Миролюбивый',
        membersCount: 22,
        herald: { x: -780, y: 118, z: 1520 },
    },
    {
        id: 'demo-pepelnaya-marka',
        name: 'Пепельная Марка',
        type: 'PROVINCE',
        diplomacy: 'Агрессивный',
        membersCount: 31,
        herald: { x: -3620, y: 131, z: 2950 },
    },
    {
        id: 'demo-kamenny-brod',
        name: 'Каменный Брод',
        type: 'TOWNSHIP',
        diplomacy: 'Нейтральный',
        membersCount: 14,
        herald: { x: 2310, y: 109, z: 640 },
    },
    {
        id: 'demo-medvezhiy-log',
        name: 'Медвежий Лог',
        type: 'VILLAGE',
        diplomacy: 'Миролюбивый',
        membersCount: 9,
        herald: { x: 920, y: 124, z: -1260 },
    },
    {
        id: 'demo-tihaya-zavod',
        name: 'Тихая Заводь',
        type: 'VILLAGE',
        diplomacy: 'Нейтральный',
        membersCount: 8,
        herald: { x: 1640, y: 112, z: 3050 },
    },
    {
        id: 'demo-severnaya-zastava',
        name: 'Северная застава',
        type: 'CAMP',
        diplomacy: 'Нейтральный',
        membersCount: 4,
        herald: { x: -1450, y: 140, z: -2380 },
    },
    {
        id: 'demo-gnezdo-vorona',
        name: 'Гнездо Ворона',
        type: 'CAMP',
        diplomacy: 'Агрессивный',
        membersCount: 6,
        herald: { x: 3880, y: 97, z: 3410 },
    },
];
