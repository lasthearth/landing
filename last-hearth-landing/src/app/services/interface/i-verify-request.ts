import { IVerifyData } from "./i-verify-data";

export interface IVerifyRequest extends IVerifyData {
    user_id: string;
}
