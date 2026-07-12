import { Sector } from './sector.interface';

export interface User {
    sub: string;
    name: string;
    email: string;
    pictureUrl: string;
    createdAt: Date;
}
