import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { Organization } from '../org.interface';

const getOrganization = async () => {
    const organizationsResponse = await fetch(`${environment.baseURL}/api/orgs?confirmed=true`);
    if(!organizationsResponse.ok) return [];
    const organizations: Organization[] = await organizationsResponse.json();
    return organizations;
}

@Component({
    selector: 'app-home',
    imports: [ReactiveFormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {

    organizations: Organization[] = [];

    createOrgForm = new FormGroup({
        name: new FormControl(''),
    });

    constructor(){
        getOrganization().then(orgs => this.organizations = orgs);
    }

    async createOrganization() {
        const organizationResponse = await fetch(`${environment.baseURL}/api/orgs`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name: this.createOrgForm.value.name,
            }),
        });
        if(!organizationResponse.ok) return;
        this.organizations.push(await organizationResponse.json());
    }
}
