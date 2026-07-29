import { Component, inject, signal } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Sector } from '../../interfaces/sector.interface';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MembershipsService } from '../../services/memberships.service';
import { Member } from '../../interfaces/member.interface';
import { form, FormField } from '@angular/forms/signals';

@Component({
    selector: 'app-sectors',
    imports: [FormField, RouterLink],
    templateUrl: './sectors.component.html',
    styleUrl: './sectors.component.css',
})
export class SectorsComponent {
    route = inject(ActivatedRoute);

    apiService = inject(ApiService);

    membershipsService = inject(MembershipsService);

    ownMembership = signal<Member | null>(null);

    sectors = signal<Sector[]>([]);

    newSectorFormModel = signal({name: ''});

    newSectorForm = form(this.newSectorFormModel);

    constructor(){
        const organizationId = this.route.snapshot.paramMap.get('id');
        this.membershipsService.getMembershipByOrganizationId(organizationId ?? '').then(this.ownMembership.set);
        this.apiService.getResources<Sector>(`orgs/${organizationId}/sectors`).then(this.sectors.set);
    }

    async submitSector(event: Event){
        event.preventDefault();
        const newSector = await this.apiService.createOrUpdateResource<Sector>(
            `orgs/${this.route.snapshot.paramMap.get('id')}/sectors`,
            {data: {name: this.newSectorForm.name().value()}},
        );
        this.sectors.update(sectors => sectors.concat(newSector));
        this.newSectorForm().reset();
    }
}
