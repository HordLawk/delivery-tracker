import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';
import { Session } from './api.interface';
import { DOCUMENT } from '@angular/common';

export const authGuard: CanActivateFn = async (route, state) => {
    const document = inject(DOCUMENT);
    if(!document.defaultView) return false;
    const response = await fetch(`${environment.baseURL}/api/session`);
    if (response.status === 204) return true;
    if (response.status !== 201) return false;
    const openidConfigResponse = await fetch('https://accounts.google.com/.well-known/openid-configuration');
    if (!openidConfigResponse.ok) return false;
    const data: Session = await response.json();
    const openidConfig = await openidConfigResponse.json();
    document.defaultView.location.href = (
        `${openidConfig.authorization_endpoint}?client_id=${environment.googleClientId}&response_type=code` +
        `&scope=openid%20email%20profile&redirect_uri=${environment.baseURL}/auth/callback` +
        `&state=${data.state}--${state.url}&nonce=${Math.floor(Math.random() * 1000000)}`
    );
    return false;
};