import { User } from './user.interface';

export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    owner?: User;
}
