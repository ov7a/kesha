<script lang="ts">
	import { getPronunciation } from './DataProvider';
	import Waveform from "./Waveform.svelte";
	import { Writable, writable } from "svelte/store";
	import { onMount } from "svelte";
	import AudioRecorder from 'audio-recorder-polyfill';

	if (!window.MediaRecorder){ //polyfill
		window.MediaRecorder = AudioRecorder;
	}

	export let word: string;

	var phonetic: string;

	var referencePronunciation: Waveform;
	var referencePronunciationZoom: Writable<number> = writable(1)
	var userPronunciation: Waveform;
	var userPronunciationZoom: Writable<number> = writable(1);
	var zoomInSync = true;

	var currentRecoder: MediaRecorder;
	var recordingInProgress = false;

	async function getWord(){
		let pronunciation = await getPronunciation(word);

		phonetic = pronunciation.phonetic;

		referencePronunciation.empty();
		if (pronunciation.audio){
			referencePronunciation.load(pronunciation.audio);
		}		
	}

	async function startRecording() {
		let stream = await navigator.mediaDevices.getUserMedia({audio: true});

		currentRecoder = new MediaRecorder(stream);
		currentRecoder.addEventListener('dataavailable', event => {
			userPronunciation.load(URL.createObjectURL(event.data));
		});
		currentRecoder.start();
		recordingInProgress = true;
	}

	function stopRecording() {				
		currentRecoder.stream.getTracks().forEach(track => track.stop());
		currentRecoder.stop();
		recordingInProgress = false;
	}

	async function askRecordingPermission(){
		let stream = await navigator.mediaDevices.getUserMedia({audio: true})
		stream.getTracks().forEach(track => track.stop());
	}

	function maybeUpdateZoom(writable: Writeable<number>, value: number){
		if (zoomInSync){
			writable.set(value);
		}
	}

	onMount(() => {
		askRecordingPermission();
		referencePronunciationZoom.subscribe(value => maybeUpdateZoom(userPronunciationZoom, value))
		userPronunciationZoom.subscribe(value => maybeUpdateZoom(referencePronunciationZoom, value))
	});
</script>

<main>
	<h1>Pronunciation of</h1>
	<input type="text" bind:value="{word}">
	<input type="button" on:click="{getWord}" value="get">
	
	<div class:hidden={!(phonetic && phonetic.length > 0)}>
		<p contenteditable="true">[{phonetic}]</p>
		<Waveform bind:this={referencePronunciation} waveColor="pink" progressColor="lightgreen" bind:zoom={$referencePronunciationZoom}/>
	</div>
	<div>
		<input type="button"  
			class:active={recordingInProgress} 
			on:touchstart="{startRecording}" 
			on:touchend="{event => {stopRecording(); event.preventDefault()}}" 
			on:mousedown="{startRecording}"
			on:mouseup="{stopRecording}"
			value="hold to record">	

		<Waveform bind:this={userPronunciation} waveColor="green" progressColor="blue" bind:zoom={$userPronunciationZoom}/>

		<label>
			<input type="checkbox" bind:checked="{zoomInSync}"/>
			keep zoom the same
		</label>
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
	input.active {
		background-color: red;
	}
	.hidden {
		display: none;
	}
</style>