import { UpgradeResource } from './upgrade-resource.type';

/**
 * Единица, в которой стоимость показывается игроку.
 *
 * Деньги (`money`) выводятся монетами: дукаты, серебряные, медные.
 * Название — в словаре: полное `keyPoints.resources.<единица>.<форма>`, краткое `keyPoints.short.<единица>`.
 */
export type CostUnit = Exclude<UpgradeResource, 'money'> | 'ducats' | 'silver' | 'copper';
