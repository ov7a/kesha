<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import WaveSurfer from 'wavesurfer.js';

	export let waveColor = 'pink';
	export let progressColor = 'lightgreen';
	export let duration: number;
	export let zoom: number;

	let waveform: WaveSurfer;
	let domContainer: HTMLElement;
	let maxZoom: number = 5000;
	let minZoom: number = 1;

	onMount(() => {
		waveform = WaveSurfer.create({
			container: domContainer,
			waveColor: waveColor,
			progressColor: progressColor,
			scrollParent: true,
			normalize: true,
			fillParent: false,
			responsive: true,
		});

		waveform.on('ready', function () {
			duration = waveform.getDuration();
			updateZoomLimits();
		});
	});

	export function empty() {
		waveform.empty();
	}

	export function load(url: string) {
		waveform.load(url);
	}

	function updateZoom() {
		waveform?.zoom(zoom);
	}

	function updateZoomLimits() {
		if ((duration ?? 0) != 0) {
			let maxWidth = domContainer.getBoundingClientRect().width;
			minZoom = maxWidth / duration;
		} else {
			minZoom = 1;
		}
		zoom = Math.min(maxZoom, zoom);
		zoom = Math.max(minZoom, zoom);
		updateZoom();
	}

	afterUpdate(() => updateZoom());
</script>

<main>
	<div bind:this="{domContainer}"></div>
	<input type="button" on:click="{(_) => waveform.playPause()}" value="play" />
	<input class="zoom" type="range" min="{minZoom}" max="{maxZoom}" bind:value="{zoom}" on:input="{updateZoom}" />
</main>

<style>
	input.zoom {
		width: 100%;
	}
</style>
