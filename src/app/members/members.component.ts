import { Component, inject, signal } from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import { Member } from '../member.interface';
import { ApiService } from '../api.service';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
    selector: 'app-members',
    imports: [FormField],
    templateUrl: './members.component.html',
    styleUrl: './members.component.css',
})
export class MembersComponent {
    route = inject(ActivatedRoute);

    apiService = inject(ApiService);

    members = signal<Member[]>([]);

    invitedMembers = signal<Member[]>([]);

    inviteFormModel = signal<{email: string}>({
        email: '',
    });

    inviteForm = form(this.inviteFormModel);

    constructor(){
        this.apiService
            .getResources<Member>(`orgs/${this.route.snapshot.paramMap.get('id')}/memberships`)
            .then(m => {
                this.members.set(m.filter(m2 => m2.confirmed));
                this.invitedMembers.set(m.filter(m2 => !m2.confirmed));
            });
    }

    async inviteMember(event: Event) {
        event.preventDefault();
        const newMember = await this.apiService.createResource<Member>(
            `orgs/${this.route.snapshot.paramMap.get('id')}/memberships`,
            {email: this.inviteForm.email().value()},
        );
        if(newMember) this.invitedMembers.update(memberships => memberships.concat(newMember));
    }
}
