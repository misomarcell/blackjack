import {
	afterRenderEffect,
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
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { CHAT_MAX_LENGTH, type ChatMessage } from '@blackjack/shared/protocol';
import { FloatingPanel } from '@blackjack/web/ui';

/** Table chat in the bottom-left corner. Collapses to a small button so it never hides chips or cards. */
@Component({
	selector: 'bj-chat-panel',
	imports: [FormField, FormRoot, FloatingPanel],
	templateUrl: './chat-panel.html',
	styleUrl: './chat-panel.scss',
})
export class ChatPanel {
	readonly messages = input.required<ChatMessage[]>();
	readonly send = output<string>();

	private readonly log = viewChild<ElementRef<HTMLElement>>('log');
	/**
	 * Collapsed on shorter screens so it does not cover the seats. Portrait phones give the chat its own row
	 * below the table, so it is open there. Rotating the phone applies the new screen's default again.
	 */
	private readonly roomy = matchMedia(
		'(min-height: 820px), (max-width: 767px) and (orientation: portrait)',
	);
	protected readonly open = signal(this.roomy.matches);
	/** Messages sent after this moment count as unread while the panel is collapsed. */
	private readonly seenAt = signal(Date.now());
	protected readonly unread = computed(() => {
		const seenAt = this.seenAt();
		return this.open()
			? 0
			: this.messages().filter((message) => Date.parse(message.sentAt) > seenAt).length;
	});

	private readonly model = signal({ text: '' });
	protected readonly chatForm = form(
		this.model,
		(path) => {
			required(path.text);
			maxLength(path.text, CHAT_MAX_LENGTH);
		},
		{
			submission: {
				action: async () => {
					this.send.emit(this.model().text.trim());
					this.chatForm().reset({ text: '' });
					return undefined;
				},
			},
		},
	);

	constructor() {
		const applyDefault = (event: MediaQueryListEvent): void => this.open.set(event.matches);
		this.roomy.addEventListener('change', applyDefault);
		inject(DestroyRef).onDestroy(() => this.roomy.removeEventListener('change', applyDefault));
		effect(() => {
			this.messages();
			if (this.open()) {
				this.seenAt.set(Date.now());
			}
		});
		afterRenderEffect(() => {
			this.messages();
			this.open();
			const log = this.log()?.nativeElement;
			if (log) {
				log.scrollTop = log.scrollHeight;
			}
		});
	}

	protected time(sentAt: string): string {
		return new Date(sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
}
