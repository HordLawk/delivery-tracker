import { Organization } from "./org.interface";
import { Sector } from "./sector.interface";
import { User } from "./user.interface";

export interface Member {
    organizationId: string;
    userId: string;
    sectorId?: string;
    role: string;
    confirmed: boolean;
    createdAt: Date;
    organization?: Organization;
    user?: User;
    sector?: Sector;
}
