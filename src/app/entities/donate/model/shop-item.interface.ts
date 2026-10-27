import { IAbilityItem } from './ability-item.interface';

/**
 * DTO товара магазина, получаемый от API.
 *
 * Строго соответствует protobuf-контракту ShopItem.
 * Поля created_at и updated_at передаются в формате ISO 8601.
 */
export interface IShopItemDto {
    /**
     * Уникальный идентификатор товара.
     */
    id: string;

    /**
     * Название товара.
     */
    name: string;

    /**
     * Описание товара.
     */
    description: string;

    /**
     * URL изображения товара.
     *
     * Публичный URL, полученный через MediaService.
     */
    image_url: string;

    /**
     * Цена товара.
     *
     * Передаётся как строка (decimal as string в protobuf) — не преобразуется в number,
     * чтобы избежать потери точности.
     */
    price: string;

    /**
     * Доступен ли товар для покупки.
     */
    is_available: boolean;

    /**
     * Дата создания в формате ISO 8601.
     */
    created_at: string;

    /**
     * Дата последнего обновления в формате ISO 8601.
     */
    updated_at: string;

    /**
     * Код внутриигрового ассета.
     */
    code: string;

    /**
     * Тип товара.
     */
    item_type: ShopItemType;

    /**
     * Составные части товара (для набора / ITEM_TYPE_KIT).
     */
    entries?: IKitEntryDto[];

    /**
     * Список возможностей / преимуществ товара.
     *
     * Основное применение — отображение в карточках привилегий.
     */
    privileges?: IAbilityItem[];

    /**
     * Есть ли скидка на товар.
     */
    has_discount?: boolean;

    /**
     * Процент скидки.
     */
    discount_percent?: number;

    /**
     * Итоговая цена с учётом скидки.
     */
    effective_price?: string;

    /**
     * Категория набора, который продаёт этот товар.
     *
     * Одно из значений `"kit"` | `"privilege"` | `"special"`. Пустая строка
     * или отсутствие поля означает, что набор не найден либо запись товара
     * появилась до введения поля; protobuf-JSON опускает пустую строку.
     */
    category?: string;

    /**
     * Раздел витрины внутри категории (ключ из `SHOP_SECTIONS`).
     *
     * Пустая строка или отсутствие поля — раздел не задан.
     */
    section?: string;
}

/**
 * Тип товара магазина.
 */
export type ShopItemType = 'ITEM_TYPE_UNSPECIFIED' | 'ITEM_TYPE_ITEM' | 'ITEM_TYPE_KIT';

/**
 * Категория товара магазина.
 *
 * Товар продаёт захваченный набор и наследует его категорию: бэкенд
 * присоединяет её при чтении из записи набора. Значения совпадают
 * с `KitCategory` в `@entities/kitdef`, но тип объявлен здесь, чтобы
 * слайс «Донат» оставался независимым от другого слайса.
 */
export type ShopCategory = 'kit' | 'privilege' | 'special';

/**
 * DTO составной части набора (kit entry).
 */
export interface IKitEntryDto {
    /**
     * Код захваченного предмета, к которому относится позиция.
     */
    game_code?: string;

    /**
     * Название позиции, которое видит игрок.
     */
    name: string;

    /**
     * Описание позиции.
     */
    description?: string;

    /**
     * URL изображения позиции.
     */
    image_url?: string;

    /**
     * Количество.
     */
    quantity: number;
}

/**
 * UI-модель составной части набора.
 */
export interface IKitEntry {
    /**
     * Код захваченного предмета, к которому относится позиция.
     */
    gameCode?: string;

    /**
     * Название позиции.
     */
    name: string;

    /**
     * Описание позиции.
     */
    description?: string;

    /**
     * URL изображения позиции.
     */
    imageUrl?: string;

    /**
     * Количество.
     */
    quantity: number;
}

/**
 * UI-модель товара магазина.
 *
 * Используется в компонентах для отображения.
 * Содержит отформатированные поля, удобные для шаблонов.
 */
export interface IShopItem {
    /**
     * Уникальный идентификатор товара.
     */
    id: string;

    /**
     * Название товара.
     */
    name: string;

    /**
     * Описание товара.
     */
    description: string;

    /**
     * URL изображения товара.
     */
    imageUrl: string;

    /**
     * Цена товара как строка.
     *
     * Не преобразуется в number для сохранения точности decimal.
     */
    price: string;

    /**
     * Доступен ли товар для покупки.
     */
    isAvailable: boolean;

    /**
     * Дата создания как объект Date.
     *
     * `null`, если сервер вернул невалидную дату.
     */
    createdAt: Date | null;

    /**
     * Дата создания в человекочитаемом формате.
     *
     * Формат: "DD.MM.YY - HH:mm" или "—", если дата отсутствует.
     */
    formattedCreatedAt: string;

    /**
     * Дата последнего обновления как объект Date.
     *
     * `null`, если сервер вернул невалидную дату.
     */
    updatedAt: Date | null;

    /**
     * Дата обновления в человекочитаемом формате.
     *
     * Формат: "DD.MM.YY - HH:mm" или "—", если дата отсутствует.
     */
    formattedUpdatedAt: string;

    /**
     * Код внутриигрового ассета.
     */
    code: string;

    /**
     * Тип товара.
     */
    itemType: ShopItemType;

    /**
     * Составные части товара (для набора).
     */
    entries?: IKitEntry[];

    /**
     * Список возможностей / преимуществ товара.
     *
     * Основное применение — отображение в карточках привилегий.
     */
    privileges?: IAbilityItem[];

    /**
     * Есть ли скидка на товар.
     */
    hasDiscount?: boolean;

    /**
     * Процент скидки.
     */
    discountPercent?: number;

    /**
     * Итоговая цена с учётом скидки.
     */
    effectivePrice?: string;

    /**
     * Категория набора, который продаёт этот товар.
     *
     * Маппер гарантирует одно из трёх значений: пустая или неизвестная
     * категория на проводе приводится к `'kit'`.
     */
    category: ShopCategory;

    /**
     * Раздел витрины внутри категории (ключ из `SHOP_SECTIONS`), пустая строка — без раздела.
     */
    section: string;
}

/**
 * Запрос на создание товара магазина.
 */
export interface ICreateShopItemRequest {
    /**
     * Название товара.
     */
    name: string;

    /**
     * Описание товара.
     */
    description: string;

    /**
     * URL изображения товара.
     *
     * Публичный URL, полученный через MediaService.
     */
    image_url: string;

    /**
     * Цена товара как строка.
     */
    price: string;

    /**
     * Код внутриигрового ассета.
     */
    code: string;

    /**
     * Тип товара.
     */
    item_type: ShopItemType;

    /**
     * Составные части набора.
     */
    entries?: IKitEntryDto[];

    /**
     * Список возможностей / преимуществ товара.
     */
    privileges?: IAbilityItem[];

    /**
     * Есть ли скидка.
     */
    has_discount?: boolean;

    /**
     * Процент скидки.
     */
    discount_percent?: number;

    /**
     * Раздел витрины внутри категории (ключ из `SHOP_SECTIONS`).
     *
     * Пустая строка или отсутствие поля — раздел не задан.
     */
    section?: string;
}

/**
 * Запрос на обновление товара магазина.
 */
export interface IUpdateShopItemRequest {
    /**
     * Идентификатор товара.
     */
    id?: string;

    /**
     * Название товара.
     */
    name?: string;

    /**
     * Описание товара.
     */
    description?: string;

    /**
     * URL изображения товара.
     *
     * Пусто — оставить текущее изображение.
     */
    image_url?: string;

    /**
     * Цена товара как строка.
     */
    price?: string;

    /**
     * Доступен ли товар.
     */
    is_available?: boolean;

    /**
     * Код внутриигрового ассета.
     */
    code?: string;

    /**
     * Тип товара.
     */
    item_type?: ShopItemType;

    /**
     * Составные части набора.
     */
    entries?: IKitEntryDto[];

    /**
     * Список возможностей / преимуществ товара.
     */
    privileges?: IAbilityItem[];

    /**
     * Есть ли скидка.
     */
    has_discount?: boolean;

    /**
     * Процент скидки.
     */
    discount_percent?: number;

    /**
     * Раздел витрины внутри категории (ключ из `SHOP_SECTIONS`).
     *
     * Пустая строка или отсутствие поля — раздел не задан.
     */
    section?: string;
}
