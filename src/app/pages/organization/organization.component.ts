import { Component } from '@angular/core';
import { RouterLinkWithHref, RouterOutlet } from "@angular/router";

@Component({
    selector: 'app-organization',
    imports: [RouterOutlet, RouterLinkWithHref],
    templateUrl: './organization.component.html',
    styleUrl: './organization.component.css',
})
export class OrganizationComponent {

}
