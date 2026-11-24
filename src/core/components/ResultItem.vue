<template>
	<!-- A real link where the item opens a page, so right-click, long-press and
		middle-click work as on any link; the input keeps the focus -->
	<component
		:is="href ? 'a' : 'div'"
		:id="id"
		ref="root"
		:href="href || undefined"
		:tabindex="href ? -1 : undefined"
		role="option"
		class="tacp-item"
		:class="{ 'tacp-item--active': active }"
		:aria-selected="active ? 'true' : 'false'"
		@mousemove="$emit( 'hover' )"
		@mousedown.prevent
		@click.prevent="$emit( 'activate', $event )"
	>
		<cdx-thumbnail
			v-if="item.thumbnail"
			:key="thumbUrl || ''"
			class="tacp-item__thumbnail"
			:thumbnail="thumbUrl ? { url: thumbUrl } : null"
		></cdx-thumbnail>
		<span v-else class="tacp-item__icon">
			<cdx-icon :icon="item.icon || defaultIcon"></cdx-icon>
		</span>
		<span class="tacp-item__text">
			<span class="tacp-item__title">
				<span class="tacp-item__label"><template
					v-for="( part, i ) in parts"
					:key="i"><b v-if="part.match">{{ part.text }}</b><template v-else>{{ part.text }}</template></template></span>
				<span v-if="item.badge" class="tacp-item__badge">{{ item.badge }}</span>
			</span>
			<span v-if="item.redirectFrom" class="tacp-item__redirect">{{ redirectText }}</span>
			<span v-if="item.description" class="tacp-item__description">{{ item.description }}</span>
		</span>
		<span v-if="item.actions.length" class="tacp-item__actions">
			<!-- Not focusable: reached with → from the input; inside an option it
				would not be exposed anyway, so the palette announces it -->
			<span
				v-for="( action, i ) in item.actions"
				:key="action.id"
				class="tacp-item__action"
				:class="{ 'tacp-item__action--active': active && activeAction === i }"
				:title="action.label"
				aria-hidden="true"
				@click.stop="$emit( 'action', action )"
			>
				<cdx-icon :icon="action.icon" size="small"></cdx-icon>
			</span>
		</span>
	</component>
</template>

<script>
import { defineComponent, computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { CdxIcon, CdxThumbnail } from '@wikimedia/codex';
import icons from '../icons.js';
import { highlight, msg } from '../text.js';
import { thumbWidth, safeUrl } from '../items.js';
import { sharpThumb } from '../services/thumbs.js';

export default defineComponent( {
	name: 'ResultItem',
	components: { CdxIcon, CdxThumbnail },
	props: {
		id: { type: String, required: true },
		item: { type: Object, required: true },
		query: { type: String, default: '' },
		active: { type: Boolean, default: false },
		activeAction: { type: Number, default: -1 }
	},
	emits: [ 'hover', 'activate', 'action' ],
	setup( props ) {
		const root = ref( null );
		// Set once the image has loaded; until then CdxThumbnail shows its placeholder
		const thumbUrl = ref( null );
		let observer = null;

		let sharp = false;

		function preload( url, isSharp ) {
			const img = new Image();
			img.onload = () => {
				// The plain thumbnail must not replace a sharper one that loaded first
				if ( isSharp || !sharp ) {
					sharp = sharp || isSharp;
					thumbUrl.value = url;
				}
			};
			img.src = url;
		}

		// The thumbnail as given, then, on screens that need more pixels than
		// it has (e.g. 60px at 2x), one at 40px × devicePixelRatio
		function load() {
			const { url, width } = props.item.thumbnail;
			preload( url, false );
			if ( props.item.title && width && width < thumbWidth() ) {
				sharpThumb( props.item.title )
					.then( ( better ) => better && better !== url && preload( better, true ) );
			}
		}

		// Lazy: only once the row is near the visible part of the list
		onMounted( () => {
			if ( !props.item.thumbnail ) {
				return;
			}
			if ( typeof IntersectionObserver !== 'function' ) {
				load();
				return;
			}
			observer = new IntersectionObserver( ( entries ) => {
				if ( entries.some( ( e ) => e.isIntersecting ) ) {
					observer.disconnect();
					load();
				}
			}, { rootMargin: '100px' } );
			observer.observe( root.value );
		} );
		onBeforeUnmount( () => observer && observer.disconnect() );

		return {
			root,
			thumbUrl,
			defaultIcon: icons.article,
			// Only items that open their url (App.vue activate()); modes, queries and commands do not
			href: computed( () => {
				const it = props.item;
				return it.mode || ( it.query !== null && it.query !== undefined ) || it.run ? null : safeUrl( it.url );
			} ),
			parts: computed( () => highlight( props.item.label, props.query ) ),
			redirectText: computed( () => msg( 'tacp-redirected-from', props.item.redirectFrom ) )
		};
	}
} );
</script>
