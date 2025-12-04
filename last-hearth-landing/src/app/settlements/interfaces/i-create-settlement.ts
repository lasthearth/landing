export interface ICreateSettlement {
    type?: string;

    name: string;

    description: string;

    diplomacy: string;

    coordinates: {
        x: number;
        y: number;
    };

    attachments: {
        data: string;

        description: string;
    }[];
}
