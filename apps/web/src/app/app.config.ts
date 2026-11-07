import { provideHttpClient, withFetch } from '@angular/common/http';
import {
	type ApplicationConfig,
	inject,
	provideAppInitializer,
	provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { AuthStore } from '@blackjack/web/data-access';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		provideHttpClient(withFetch()),
		provideRouter(appRoutes, withComponentInputBinding(), withViewTransitions()),
		provideAppInitializer(() => inject(AuthStore).restore()),
	],
};
