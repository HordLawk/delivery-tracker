import { Component, inject, signal } from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import { environment } from '../../environments/environment';
import { ApiService } from '../api.service';
import { RouterLink } from '@angular/router';
import { Member } from '../member.interface';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    imports: [FormField, RouterLink],
})
export class HomeComponent {

    apiService = inject(ApiService);

    memberships = signal<Member[]>([]);

    orgModel = signal<{name: string}>({
        name: '',
    });

    orgForm = form(this.orgModel);

    constructor(){
        this.apiService
            .getResources<Member>('memberships?confirmed=true')
            .then(memberships => this.memberships.set(memberships));
    }

    async createOrganization(event: Event) {
        event.preventDefault();
        const newMember = await this.apiService.createResource<Member>('orgs', {name: this.orgForm.name().value()});
        if(newMember) this.memberships.update(memberships => memberships.concat(newMember));
    }
}
