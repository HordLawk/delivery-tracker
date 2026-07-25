import { Component, inject, signal } from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Member } from '../../interfaces/member.interface';
import { MembershipsService } from '../../services/memberships.service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    imports: [FormField, RouterLink, RouterOutlet],
})
export class HomeComponent {

    router = inject(Router);

    apiService = inject(ApiService);

    membershipsService = inject(MembershipsService);

    memberships = signal<Member[]>([]);

    orgModel = signal<{name: string}>({
        name: '',
    });

    orgForm = form(this.orgModel);

    constructor(){
        this.membershipsService
            .getMemberships()
            .then(memberships => {
                this.memberships.set(memberships ?? []);
                this.router.navigate([memberships?.[0]?.organizationId ?? 'invites']);
            });
    }

    async createOrganization(event: Event) {
        event.preventDefault();
        const newMember = await this.apiService
            .createOrUpdateResource<Member>('orgs', {data: {name: this.orgForm.name().value()}})
            .catch(console.error);
        if(newMember){
            this.memberships.update(memberships => memberships.concat(newMember));
            await this.membershipsService.getMemberships(true);
        }
    }
}
