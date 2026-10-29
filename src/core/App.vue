<template>
	<cdx-dialog
		:open="store.open"
		class="tacp-palette"
		:title="msg( 'tacp-dialog-title' )"
		:aria-label="msg( 'tacp-dialog-title' )"
		:hide-title="true"
		@update:open="store.open = $event"
	>
		<template #header>
			<div class="tacp-header">
				<cdx-icon class="tacp-header__icon" :icon="icons.search"></cdx-icon>
				<span v-if="currentMode" class="tacp-chip">
					<span class="tacp-chip__label">{{ modeLabel }}</span>
					<button
						type="button"
						class="tacp-chip__remove"
						:aria-label="msg( 'tacp-mode-leave', modeLabel )"
						@click="popMode"
					>
						<cdx-icon :icon="icons.close" size="x-small"></cdx-icon>
					</button>
				</span>
				<input
					ref="input"
					v-model="query"
					class="tacp-input"
					type="text"
					role="combobox"
					autocomplete="off"
					spellcheck="false"
					aria-autocomplete="list"
					:aria-label="msg( 'tacp-dialog-title' )"
					:aria-controls="listId"
					:aria-expanded="flat.length ? 'true' : 'false'"
					:aria-activedescendant="activeDescendant"
					:placeholder="placeholder"
					@keydown="onKeydown"
				>
				<cdx-button
					class="tacp-header__close"
					weight="quiet"
					:aria-label="msg( 'tacp-close' )"
					@click="store.open = false"
				>
					<cdx-icon :icon="icons.close"></cdx-icon>
				</cdx-button>
			</div>
		</template>

		<div
			:id="listId"
			class="tacp-results"
			role="listbox"
			:aria-label="msg( 'tacp-dialog-title' )"
		>
			<div
				v-for="group in view"
				:key="group.id"
				class="tacp-group"
				role="group"
				:aria-label="group.label"
			>
				<div class="tacp-group__label" aria-hidden="true">
					{{ group.label }}
				</div>
				<result-item
					v-for="entry in group.entries"
					:id="entry.domId"
					:key="entry.domId"
					:item="entry.item"
					:query="query"
					:active="entry.index === activeIndex"
					:active-action="activeAction"
					@hover="hover( entry.index )"
					@activate="onClick( entry.item, $event )"
					@action="runAction"
				></result-item>
			</div>
		</div>
		<div v-if="emptyState" class="tacp-state">
			<cdx-icon class="tacp-state__icon" :icon="emptyState.icon"></cdx-icon>
			<p class="tacp-state__title">
				{{ emptyState.title }}
			</p>
			<p class="tacp-state__description">
				{{ emptyState.description }}
			</p>
		</div>

		<template #footer>
			<div class="tacp-footer" aria-hidden="true">
				<span><kbd>↑</kbd><kbd>↓</kbd> {{ msg( 'tacp-hint-navigate' ) }}</span>
				<span><kbd>↵</kbd> {{ msg( 'tacp-hint-open' ) }}</span>
				<span v-if="activeItem && activeItem.actions.length"><kbd>→</kbd> {{ msg( 'tacp-hint-actions' ) }}</span>
				<span><kbd>esc</kbd> {{ msg( 'tacp-hint-close' ) }}</span>
				<span><kbd>?</kbd> {{ msg( 'tacp-hint-help' ) }}</span>
			</div>
		</template>
	</cdx-dialog>
</template>

<script>
import { defineComponent, ref, shallowRef, computed, watch, nextTick } from 'vue';
import { CdxButton, CdxDialog, CdxIcon } from '@wikimedia/codex';
import ResultItem from './components/ResultItem.vue';
import store from './store.js';
import icons from './icons.js';
import { msg, text } from './text.js';
import { getGroups } from './results.js';
import { parseTrigger } from './input.js';
import { isAbort } from './services/api.js';
import { addRecent } from './services/recent.js';

const DEBOUNCE = 150;
const MAX_PREFILL = 100;

function getContext() {
	const c = mw.config;
	return Object.freeze( {
		title: c.get( 'wgPageName' ),
		namespace: c.get( 'wgNamespaceNumber' ),
		articleId: c.get( 'wgArticleId' ),
		revisionId: c.get( 'wgRevisionId' ),
		action: c.get( 'wgAction' ),
		isArticle: !!c.get( 'wgIsArticle' ),
		canEdit: !!c.get( 'wgIsProbablyEditable' ),
		userName: c.get( 'wgUserName' ),
		skin: c.get( 'skin' )
	} );
}

function selectedText() {
	const s = String( window.getSelection ? window.getSelection() : '' ).replace( /\s+/g, ' ' ).trim();
	return s && s.length < MAX_PREFILL ? s : null;
}

function remember( item ) {
	const t = item.title && mw.Title.newFromText( item.title );
	if ( t ) {
		addRecent( t.getPrefixedText(), t.getNamespaceId() );
	}
}

export default defineComponent( {
	name: 'TacpApp',
	components: { CdxButton, CdxDialog, CdxIcon, ResultItem },
	props: {
		registry: { type: Object, required: true }
	},
	setup( props ) {
		const input = ref( null );
		const query = ref( '' );
		const modeStack = shallowRef( [] );
		const groups = shallowRef( [] );
		const status = ref( 'ready' );
		const activeIndex = ref( 0 );
		const activeAction = ref( -1 );
		const openCount = ref( 0 );
		const listId = 'tacp-results';
		let context = getContext();
		let controller = null;
		let timer = null;
		// Enter pressed before the results for the current input arrived
		let pendingEnter = null;

		const currentMode = computed( () => modeStack.value[ modeStack.value.length - 1 ] || null );
		const modeLabel = computed( () => currentMode.value ? text( currentMode.value.label ) : '' );
		const view = computed( () => {
			let index = 0;
			return groups.value.map( ( g ) => ( {
				id: g.id,
				label: g.label,
				entries: g.items.map( ( item ) => {
					const i = index++;
					return { item, index: i, domId: listId + '-' + i };
				} )
			} ) );
		} );
		const flat = computed( () => groups.value.reduce( ( all, g ) => all.concat( g.items ), [] ) );
		const activeItem = computed( () => flat.value[ activeIndex.value ] || null );
		const activeDescendant = computed( () => {
			if ( !activeItem.value ) {
				return undefined;
			}
			const id = listId + '-' + activeIndex.value;
			return activeAction.value >= 0 ? id + '-action-' + activeAction.value : id;
		} );
		const placeholder = computed( () => currentMode.value ?
			msg( 'tacp-placeholder-mode', modeLabel.value ) :
			msg( 'tacp-placeholder' ) );
		const emptyState = computed( () => {
			if ( flat.value.length && status.value !== 'error' ) {
				return null;
			}
			const state = status.value === 'error' ? 'error' :
				status.value === 'loading' ? 'loading' :
					query.value.trim() ? 'noresults' :
						// A mode with nothing to list on this page, e.g. no other languages
						currentMode.value ? 'modeempty' : 'empty';
			const icon = { error: icons.alert, loading: icons.clock, noresults: icons.search, modeempty: icons.search, empty: icons.search }[ state ];
			return {
				icon,
				title: msg( 'tacp-state-' + state + '-title' ),
				description: msg( 'tacp-state-' + state + '-desc', query.value.trim() )
			};
		} );

		function close() {
			store.open = false;
		}

		function go( url ) {
			close();
			location.assign( url );
		}

		function pushMode( mode, rest ) {
			modeStack.value = modeStack.value.concat( mode );
			query.value = rest || '';
		}

		function popMode() {
			modeStack.value = modeStack.value.slice( 0, -1 );
			query.value = '';
			if ( input.value ) {
				input.value.focus();
			}
		}

		function activate( item, how ) {
			if ( !item ) {
				return;
			}
			if ( how === 'newtab' && item.url ) {
				remember( item );
				window.open( item.url, '_blank', 'noopener' );
			} else if ( how === 'edit' && item.title ) {
				remember( item );
				go( mw.util.getUrl( item.title, { action: 'edit' } ) );
			} else if ( item.mode ) {
				pushMode( item.mode );
			} else if ( item.query !== null && item.query !== undefined ) {
				// e.g. "did you mean": search for the suggestion instead
				query.value = item.query;
			} else if ( item.run ) {
				close();
				item.run();
			} else if ( item.url ) {
				remember( item );
				go( item.url );
			}
		}

		function runAction( action ) {
			if ( action.run ) {
				close();
				action.run();
			} else if ( action.url ) {
				go( action.url );
			}
		}

		function refresh() {
			const modes = props.registry.getModes( context );
			if ( !currentMode.value ) {
				const parsed = parseTrigger( query.value, modes );
				const help = query.value === '?' && modes.find( ( m ) => m.id === 'tacp-help' );
				if ( parsed || help ) {
					pushMode( parsed ? parsed.mode : help, parsed ? parsed.rest : '' );
					return;
				}
			}
			clearTimeout( timer );
			if ( controller ) {
				controller.abort();
			}
			const ctrl = controller = new AbortController();
			status.value = 'loading';
			const state = { query: query.value, mode: currentMode.value, context, registry: props.registry };
			timer = setTimeout( () => {
				getGroups( state, ctrl.signal ).then( ( result ) => {
					if ( ctrl.signal.aborted ) {
						return;
					}
					groups.value = result;
					status.value = 'ready';
					activeIndex.value = 0;
					activeAction.value = -1;
					if ( pendingEnter ) {
						const how = pendingEnter;
						pendingEnter = null;
						activate( flat.value[ 0 ], how );
					}
				}, ( err ) => {
					if ( ctrl.signal.aborted || isAbort( err ) ) {
						return;
					}
					mw.log.warn( 'TACP:', err );
					groups.value = [];
					status.value = 'error';
					pendingEnter = null;
				} );
			}, query.value.trim() && query.value.charAt( 0 ) !== '/' ? DEBOUNCE : 0 );
		}

		function move( delta ) {
			const n = flat.value.length;
			if ( !n ) {
				return;
			}
			activeIndex.value = ( activeIndex.value + delta + n ) % n;
			activeAction.value = -1;
			nextTick( () => {
				const el = document.getElementById( activeDescendant.value );
				if ( el ) {
					el.scrollIntoView( { block: 'nearest' } );
				}
			} );
		}

		function hover( index ) {
			if ( index !== activeIndex.value ) {
				activeIndex.value = index;
				activeAction.value = -1;
			}
		}

		function onClick( item, e ) {
			activate( item, e.ctrlKey || e.metaKey ? 'newtab' : e.shiftKey ? 'edit' : 'open' );
		}

		function onKeydown( e ) {
			if ( e.isComposing ) {
				return;
			}
			const item = activeItem.value;
			switch ( e.key ) {
				case 'ArrowDown':
				case 'ArrowUp':
					e.preventDefault();
					move( e.key === 'ArrowDown' ? 1 : -1 );
					break;
				case 'ArrowRight':
					// Only once the caret is at the end, so the input stays editable
					if ( item && activeAction.value < item.actions.length - 1 &&
						e.target.selectionStart === e.target.value.length ) {
						e.preventDefault();
						activeAction.value++;
					}
					break;
				case 'ArrowLeft':
					if ( activeAction.value >= 0 ) {
						e.preventDefault();
						activeAction.value--;
					}
					break;
				case 'Enter': {
					e.preventDefault();
					const how = e.ctrlKey || e.metaKey ? 'newtab' : e.shiftKey ? 'edit' : 'open';
					if ( status.value === 'loading' ) {
						pendingEnter = how;
					} else if ( item && activeAction.value >= 0 ) {
						runAction( item.actions[ activeAction.value ] );
					} else {
						activate( item, how );
					}
					break;
				}
				case 'Backspace':
					if ( !query.value && modeStack.value.length ) {
						e.preventDefault();
						popMode();
					}
					break;
			}
		}

		watch( [ query, () => modeStack.value.length, openCount ], refresh );

		watch( () => store.open, ( isOpen ) => {
			if ( isOpen ) {
				context = getContext();
				const fromSelection = store.prefill === null ? selectedText() : null;
				modeStack.value = [];
				groups.value = [];
				query.value = store.prefill !== null ? store.prefill : fromSelection || '';
				openCount.value++;
				// After CdxDialog's own focus handling, which runs on nextTick
				setTimeout( () => {
					if ( input.value ) {
						input.value.focus();
						if ( fromSelection ) {
							input.value.select();
						}
					}
				} );
			} else {
				clearTimeout( timer );
				if ( controller ) {
					controller.abort();
				}
				pendingEnter = null;
			}
		} );

		return {
			store, icons, msg, input, query, listId, view, flat, activeIndex, activeAction,
			activeItem, activeDescendant, currentMode, modeLabel, placeholder, emptyState,
			popMode, hover, onClick, onKeydown, runAction
		};
	}
} );
</script>
