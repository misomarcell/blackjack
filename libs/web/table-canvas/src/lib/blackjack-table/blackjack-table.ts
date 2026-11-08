import {
	afterNextRender,
	Component,
	computed,
	DestroyRef,
	effect,
	type ElementRef,
	inject,
	input,
	output,
	signal,
	viewChild,
} from '@angular/core';
import type { TableView } from '@blackjack/shared/protocol';
import { TableAudio } from '../audio/table-audio';
import { TableScene } from '../scene/table-scene';

/**
 * `<blackjack-table>`: the animated PixiJS table. Purely presentational — give it the latest
 * snapshot and who is watching, and it animates the difference. Seat clicks come back out.
 */
@Component({
	selector: 'blackjack-table',
	templateUrl: './blackjack-table.html',
	styleUrl: './blackjack-table.scss',
})
export class BlackjackTable {
	readonly table = input<TableView | null>(null);
	readonly viewerId = input<number | null>(null);
	/** The viewer's seat taking chips right now, highlighted on the felt. */
	readonly focusSeat = input<number | null>(null);
	/** CSS pixels kept free above the table for the status overlay. */
	readonly topInset = input(56);
	/** Crop the empty felt along the rail, for short phone screens. */
	readonly compact = input(false);
	readonly seatPicked = output<number>();

	private readonly stage = viewChild.required<ElementRef<HTMLDivElement>>('stage');
	private readonly destroyRef = inject(DestroyRef);
	private readonly audio = inject(TableAudio);
	private readonly scene = signal<TableScene | null>(null);

	/** Text alternative for screen readers, since the canvas itself is not accessible. */
	protected readonly summary = computed(() => {
		const table = this.table();
		if (!table) {
			return 'Loading table';
		}
		const seated = table.seats.filter((seat) => seat.player).length;
		const dealer = table.dealer.total === null ? 'no cards' : `showing ${table.dealer.total}`;
		return `${table.name}: ${seated} of ${table.seats.length} seats taken, dealer ${dealer}.`;
	});

	constructor() {
		afterNextRender(() => void this.createScene());
		effect(() => this.scene()?.setFraming({ topInset: this.topInset(), compact: this.compact() }));
		effect(() => {
			const scene = this.scene();
			const table = this.table();
			if (scene && table) {
				scene.render(table, this.viewerId(), this.focusSeat());
			}
		});
		this.audio.enterTable();
		this.destroyRef.onDestroy(() => {
			this.audio.leaveTable();
			this.scene()?.destroy();
		});
	}

	private async createScene(): Promise<void> {
		await document.fonts.load('32px "Lilita One"');
		const scene = await TableScene.create(this.stage().nativeElement, this.audio, (seat) =>
			this.seatPicked.emit(seat),
		);
		if (this.destroyRef.destroyed) {
			scene.destroy();
			return;
		}
		this.scene.set(scene);
	}
}
