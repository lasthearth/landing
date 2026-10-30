import { SUBMIT_SETTLEMENT_TYPE } from './submit-settlement-type.constant';

describe('SUBMIT_SETTLEMENT_TYPE', () => {
    it('шлёт тип надела числом 1 — CAMP в SubmitRequest.Type', () => {
        expect(SUBMIT_SETTLEMENT_TYPE.camp).toBe(1);
    });

    it('шлёт тип гильдии числом 2 — GUILD в SubmitRequest.Type', () => {
        expect(SUBMIT_SETTLEMENT_TYPE.guild).toBe(2);
    });

    it('не содержит нуля: TYPE_UNSPECIFIED сервер отвергает до чтения базы', () => {
        const values: readonly number[] = Object.values(SUBMIT_SETTLEMENT_TYPE);

        expect(values).not.toContain(0);
    });
});
