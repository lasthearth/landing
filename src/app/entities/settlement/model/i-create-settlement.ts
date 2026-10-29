export interface ICreateSettlement {
    /** Тип надела: 0 = CAMP (стан). Бэкенд принимает int32. */
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
