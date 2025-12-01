export const fileFieldsTownship = [
    'map',
    'monument',
    'playersDocuments',
    'yardage',
    'pit',
    'roads',
    'warehouse',
    'barn',
    'seedbeds',
    'oneFloorHouse1',
    'oneFloorHouse2',
    'oneFloorHouse3',
    'oneFloorHouse4',
    'doubleFloorHouse1',
    'workshop',
    'blacksmithShop',
    'preview',
] as const;

export type FileKeyTownship = (typeof fileFieldsTownship)[number];
