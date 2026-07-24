import { Service } from '@angular/core';
import { environment } from '../../environments/environment';

@Service()
export class ApiService {
    async getResources<T>(url: string){
        const response = await fetch(`${environment.baseURL}/api/${url}`);
        if(!response.ok) return [];
        const documents: T[] = await response.json();
        return documents;
    }

    async createOrUpdateResource<T>(
        url: string,
        options: {
            data?: {[key: string]: any},
            method?: string,
        },
    ){
        const response = await fetch(`${environment.baseURL}/api/${url}`, {
            method: options.method ?? 'POST',
            headers: {'Content-Type': 'application/json'},
            body: options.data && JSON.stringify(options.data),
        });
        if(!response.ok){
            const error = await response.json().catch(() => null);
            throw {
                status: response.status,
                response: error,
            };
        }
        const resource: T = await response.json().catch(() => null);
        return resource;
    }
}
