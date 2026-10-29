/**
 * Тип, представляющий любой ключ из массива `fileFields`.
 * Используется для обращения к конкретным файлам гильдию.
 */
export type FileKeyGuild = (typeof fileFields)[number];
/**
 * Список ключей файлов, связанных с гильдию.
 */
export const fileFields = ['preview', 'map', 'passport', 'guildLiberties', 'guildOffice', 'guildMinorOffice', 'guildBoard', 'guildSellMarket', 'guildBuyMarket', 'guildMinorSellMarket', 'guildMinorBuyMarket'] as const;
