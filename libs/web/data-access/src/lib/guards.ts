import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/** Sends guests to the login page and remembers where they wanted to go (e.g. a shared table link). */
export const authGuard: CanActivateFn = (_route, state) =>
	inject(AuthStore).signedIn() ||
	inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

export const adminGuard: CanActivateFn = () =>
	inject(AuthStore).isAdmin() || inject(Router).createUrlTree(['/lobby']);

export const guestGuard: CanActivateFn = () =>
	!inject(AuthStore).signedIn() || inject(Router).createUrlTree(['/lobby']);
