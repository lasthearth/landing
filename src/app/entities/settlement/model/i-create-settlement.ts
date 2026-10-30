export interface ICreateSettlement {
    /**
     * Тип заявки — значение `SUBMIT_SETTLEMENT_TYPE` (`entities/settlement`):
     * `camp` (1) — надел, `guild` (2) — гильдия. Ноль сервер отвергает как
     * TYPE_UNSPECIFIED. Ступень надела заявка не несёт: её повышает бэкенд.
     */
    type?: number;

    name: string;

    description: string;

    diplomacy: string;

    coordinates: {
        x: number;
        y: number;
    };

    attachments: {
        url: string;

        description: string;
    }[];
}
