import { enableProdMode, InjectionToken } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
import { environment } from './environments/environment';


if (environment.production) {
    enableProdMode();
}

export const API_BASE_URL = new InjectionToken<string>("Api Base Url");

// https://stackoverflow.com/a/2091331/1270504
function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}

const queryBaseUrl = getQueryVariable("api_base_url");

platformBrowserDynamic([
    {
        provide: API_BASE_URL,
        useValue: queryBaseUrl || "/"
    }
]).bootstrapModule(AppModule)
    .catch(err => console.error(err));
