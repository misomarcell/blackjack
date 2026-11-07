import type { Route } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from '@blackjack/web/data-access';

export const appRoutes: Route[] = [
	{
		path: 'login',
		title: 'Sign in · Blackjack Party',
		canActivate: [guestGuard],
		loadComponent: () => import('@blackjack/web/feature-auth').then((m) => m.LoginPage),
	},
	{
		path: 'register',
		title: 'Register · Blackjack Party',
		canActivate: [guestGuard],
		loadComponent: () => import('@blackjack/web/feature-auth').then((m) => m.RegisterPage),
	},
	{
		path: 'lobby',
		title: 'Lobby · Blackjack Party',
		canActivate: [authGuard],
		loadComponent: () => import('@blackjack/web/feature-lobby').then((m) => m.LobbyPage),
	},
	{
		path: 'table/:id',
		title: 'Table · Blackjack Party',
		canActivate: [authGuard],
		loadComponent: () => import('@blackjack/web/feature-table').then((m) => m.TablePage),
	},
	{
		path: 'admin',
		title: 'Manage tables · Blackjack Party',
		canActivate: [authGuard, adminGuard],
		loadComponent: () => import('@blackjack/web/feature-admin').then((m) => m.AdminTablesPage),
	},
	{ path: '', pathMatch: 'full', redirectTo: 'lobby' },
	{ path: '**', redirectTo: 'lobby' },
];
