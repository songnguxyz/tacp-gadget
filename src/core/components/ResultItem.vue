<template>
	<div
		:id="id"
		ref="root"
		role="option"
		class="tacp-item"
		:class="{ 'tacp-item--active': active }"
		:aria-selected="active ? 'true' : 'false'"
		@mousemove="$emit( 'hover' )"
		@click="$emit( 'activate', $event )"
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
			<!-- Not focusable: reached with → from the input (aria-activedescendant) -->
			<span
				v-for="( action, i ) in item.actions"
				:id="id + '-action-' + i"
				:key="action.id"
				role="button"
				class="tacp-item__action"
				:class="{ 'tacp-item__action--active': active && activeAction === i }"
				:title="action.label"
				:aria-label="action.label"
				@click.stop="$emit( 'action', action )"
			>
				<cdx-icon :icon="action.icon" size="small"></cdx-icon>
			</span>
		</span>
	</div>
</template>

<script>
import { defineComponent, computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { CdxIcon, CdxThumbnail } from '@wikimedia/codex';
import icons from '../icons.js';
import { highlight, msg } from '../text.js';
import { thumbWidth, sizedThumb } from '../items.js';

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

		function preload( url, onError ) {
			const img = new Image();
			img.onload = () => {
				thumbUrl.value = url;
			};
			img.onerror = onError;
			img.src = url;
		}

		// The thumbnail at 40px × devicePixelRatio; the original URL if that
		// width fails (e.g. wider than the file itself)
		function load() {
			const url = props.item.thumbnail.url;
			const sized = sizedThumb( url, thumbWidth() );
			preload( sized, () => sized !== url && preload( url ) );
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
			parts: computed( () => highlight( props.item.label, props.query ) ),
			redirectText: computed( () => msg( 'tacp-redirected-from', props.item.redirectFrom ) )
		};
	}
} );
</script>
