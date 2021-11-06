<script lang="ts">
	import { onMount } from "svelte";
	import { Writable, writable } from "svelte/store";

	import { getPronunciation } from './DataProvider';
	import Waveform from "./Waveform.svelte";
	import RecordButton from './RecordButton.svelte';

	export let word: string;

	var phonetic: string;

	var referencePronunciation: Waveform;
	var referencePronunciationZoom: Writable<number> = writable(1)
	var userPronunciation: Waveform;
	var userPronunciationZoom: Writable<number> = writable(1);
	var zoomInSync = true;

	async function getWord(){
		let pronunciation = await getPronunciation(word);

		phonetic = pronunciation.phonetic;

		referencePronunciation.empty();
		userPronunciation.empty();
		if (pronunciation.audio){
			referencePronunciation.load(pronunciation.audio);
		}		
	}

	function displayRecording(url: string){
		userPronunciation.load(url);
	}

	function maybeUpdateZoom(writable: Writeable<number>, value: number){
		if (zoomInSync){
			writable.set(value);
		}
	}

	onMount(() => { //can be done with events, but whatever
		referencePronunciationZoom.subscribe(value => maybeUpdateZoom(userPronunciationZoom, value))
		userPronunciationZoom.subscribe(value => maybeUpdateZoom(referencePronunciationZoom, value))
	});
</script>

<main>
	<h1>Pronunciation of</h1>
	<input type="text" bind:value="{word}">
	<input type="button" on:click="{getWord}" value="get">
	
	<div class:hidden={!(phonetic && phonetic.length > 0)}>
		<div>
			<p contenteditable="true">[{phonetic}]</p>
			<Waveform bind:this={referencePronunciation} waveColor="pink" progressColor="lightgreen" bind:zoom={$referencePronunciationZoom}/>
		</div>

		<RecordButton on:recordComplete={e => displayRecording(e.detail)}/>
			
		<div>
			<Waveform bind:this={userPronunciation} waveColor="green" progressColor="blue" bind:zoom={$userPronunciationZoom}/>

			<label>
				<input type="checkbox" bind:checked="{zoomInSync}"/>
				keep zoom the same
			</label>
		</div>	
	</div>

	<p>NOTE: this is an MVP and works... barely.</p>

	<p>
		<span>Powered by:</span>
		<a href="https://svelte.dev">Svelte</a>
		<a href="https://dictionaryapi.dev/">Free Dictionary API</a>
		<a href="https://wavesurfer-js.org/">wavesurfer-js</a>
		<a href="http://allorigins.win/">allOrigins</a>
	</p>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 800px;
		margin: 0 auto;
	}
	.hidden {
		display: none;
	}
</style>