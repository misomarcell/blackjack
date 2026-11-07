import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '@blackjack/web/data-access';
import { TopBar } from './top-bar/top-bar';

@Component({
	selector: 'bj-root',
	imports: [RouterOutlet, TopBar],
	templateUrl: './app.html',
	styleUrl: './app.scss',
})
export class App {
	protected readonly auth = inject(AuthStore);
}
