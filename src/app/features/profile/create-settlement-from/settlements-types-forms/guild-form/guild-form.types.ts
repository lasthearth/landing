/**
 * Тип, представляющий любой ключ из массива `fileFields`.
 * Используется для обращения к конкретным файлам гильдии.
 */
export type FileKeyGuild = (typeof fileFields)[number];

/**
 * Список ключей файлов, связанных с гильдией.
 */
export const fileFields = [
    'preview',
    'map',
    'monument',
    'guildPatentDocument',
    'guildLibertiesDocument',
    'guildSquare',
    'guildWell',
    'guildPaths',
    'guildStorage',
    'guildBarn',
    'guildFarm',
    'guildAdditionalBuilding1',
    'guildAdditionalBuilding2',
    'guildAdditionalBuilding3',
] as const;
