import { Component, inject, signal } from '@angular/core';
import { Member } from '../../interfaces/member.interface';
import { ApiService } from '../../services/api.service';
import { MembershipsService } from '../../services/memberships.service';

@Component({
    selector: 'app-invites',
    imports: [],
    templateUrl: './invites.component.html',
    styleUrl: './invites.component.css',
})
export class InvitesComponent {
    apiService = inject(ApiService);

    membershipsService = inject(MembershipsService);

    invitations = signal<Member[]>([]);

    constructor(){
        this.apiService
            .getResources<Member>('memberships?confirmed=false')
            .then(memberships => this.invitations.set(memberships));
    }

    async acceptInvitation(orgId: string){
        await this.apiService.createOrUpdateResource(
            `memberships/${orgId}`,
            {
                data: {confirmed: true},
                method: 'PATCH',
            }
        );
        this.invitations.update(memberships => memberships.filter(m => m.organizationId !== orgId));
        await this.membershipsService.getMemberships(true);
    }
}
