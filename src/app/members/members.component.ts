import { Component, inject, signal } from '@angular/core';
import { Member } from '../member.interface';
import { ApiService } from '../api.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-members',
    imports: [],
    templateUrl: './members.component.html',
    styleUrl: './members.component.css',
})
export class MembersComponent {
    route = inject(ActivatedRoute);

    apiService = inject(ApiService);

    members = signal<Member[]>([]);

    invitedMembers = signal<Member[]>([]);

    constructor(){
        this.apiService
            .getResources<Member>(`orgs/${this.route.snapshot.paramMap.get('id')}/members`)
            .then(m => {
                this.members.set(m.filter(m2 => m2.confirmed));
                this.invitedMembers.set(m.filter(m2 => !m2.confirmed));
            });
    }
}
