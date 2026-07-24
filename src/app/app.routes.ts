import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { DetailsComponent } from './pages/details/details.component';
import { authGuard } from './guards/auth.guard';
import { DeliveriesComponent } from './pages/deliveries/deliveries.component';
import { MembersComponent } from './pages/members/members.component';
import { InvitesComponent } from './pages/invites/invites.component';

export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        title: 'Home',
        canActivate: [authGuard],
    },
    {
        path: 'invites',
        component: InvitesComponent,
        canActivate: [authGuard],
    },
    {
        path: ':id/members',
        component: MembersComponent,
        canActivate: [authGuard],
    },
    {
        path: ':id',
        component: DeliveriesComponent,
        canActivate: [authGuard],
    },
];
