import { Component, inject, signal } from '@angular/core';
import {form, FormField} from '@angular/forms/signals';
import { environment } from '../../environments/environment';
import { Organization } from '../org.interface';
import { ApiService } from '../api.service';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.css',
    imports: [FormField, RouterLink],
})
export class HomeComponent {

    apiService = inject(ApiService);

    organizations = signal<Organization[]>([]);

    orgModel = signal<{name: string}>({
        name: '',
    });

    orgForm = form(this.orgModel);

    constructor(){
        this.apiService.getResources<Organization>('orgs?confirmed=true').then(orgs => this.organizations.set(orgs));
    }

    async createOrganization(event: Event) {
        event.preventDefault();
        const organizationResponse = await fetch(`${environment.baseURL}/api/orgs`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: this.orgForm.name().value(),
            }),
        });
        if(!organizationResponse.ok) return;
        const newOrg: Organization = await organizationResponse.json();
        this.organizations.update(orgs => orgs.concat(newOrg));
    }
}
