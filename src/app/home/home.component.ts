import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { environment } from '../../environments/environment';
import { Organization } from '../org.interface';

const getOrganization = async () => {
    const organizationsResponse = await fetch(`${environment.baseURL}/api/orgs`);
    if(!organizationsResponse.ok) return;
    const organizations: Organization[] = await organizationsResponse.json();
    return organizations[0];
}

@Component({
    selector: 'app-home',
    imports: [ReactiveFormsModule],
    templateUrl: './home.component.html',
    styleUrl: './home.component.css'
})
export class HomeComponent {

    organization?: Organization;

    createOrgForm = new FormGroup({
        name: new FormControl(''),
    });

    constructor(){
        getOrganization().then(org => this.organization = org);
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
        this.organization = await organizationResponse.json();
    }
}
