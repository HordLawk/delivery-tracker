import { Component, inject, signal } from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import { Member } from '../../interfaces/member.interface';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MembershipsService } from '../../services/memberships.service';

@Component({
    selector: 'app-members',
    imports: [FormField],
    templateUrl: './members.component.html',
    styleUrl: './members.component.css',
})
export class MembersComponent {
    route = inject(ActivatedRoute);

    apiService = inject(ApiService);

    membershipsService = inject(MembershipsService);

    members = signal<Member[]>([]);

    ownMembership = signal<Member | null>(null);

    invitedMembers = signal<Member[]>([]);

    inviteFormModel = signal<{email: string}>({
        email: '',
    });

    inviteForm = form(this.inviteFormModel);

    constructor(){
        const orgId = this.route.snapshot.paramMap.get('id');
        this.apiService
            .getResources<Member>(`orgs/${orgId}/memberships`)
            .then(m => {
                this.members.set(m.filter(m2 => m2.confirmed));
                this.invitedMembers.set(m.filter(m2 => !m2.confirmed));
            });
        this.membershipsService.getMembershipByOrganizationId(orgId ?? '').then(m => this.ownMembership.set(m));
    }

    inviteMember(event: Event) {
        event.preventDefault();
        this.apiService
            .createOrUpdateResource<Member>(
                `orgs/${this.route.snapshot.paramMap.get('id')}/memberships`,
                {data: {email: this.inviteForm.email().value()}},
            )
            .then(newMember => this.invitedMembers.update(memberships => memberships.concat(newMember)))
            .catch(err => {
                if(err.status === 400 && err.response?.error) return alert(err.response.error);
                console.error(err);
            });
    }
}
