import { inject, Service } from '@angular/core';
import { Member } from '../interfaces/member.interface';
import { ApiService } from './api.service';

@Service()
export class MembershipsService {
    apiService = inject(ApiService);

    memberships: Member[] | null = null;

    async getMemberships(force?: boolean): Promise<Member[] | null> {
        if (!this.memberships || force) {
            const memberships = await this.apiService.getResources<Member>('memberships?confirmed=true');
            this.memberships = memberships;
        }
        return this.memberships;
    }

    async getMembershipByOrganizationId(organizationId: string): Promise<Member | null> {
        if(!this.memberships) await this.getMemberships();
        return this.memberships?.find(m => m.organizationId === organizationId) ?? null;
    }
}
