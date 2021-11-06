<script context="module" lang="ts">
	import AudioRecorder from 'audio-recorder-polyfill';

	if (!window.MediaRecorder){ //polyfill
		window.MediaRecorder = AudioRecorder;
	}

    async function askRecordingPermission(){
		let stream = await navigator.mediaDevices.getUserMedia({audio: true})
		stream.getTracks().forEach(track => track.stop());
	}

	askRecordingPermission();
</script>

<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

    var recordingInProgress = false;
	var currentRecoder: MediaRecorder;
	
	async function startRecording() {	
		let stream = await navigator.mediaDevices.getUserMedia({audio: true});

		currentRecoder = new MediaRecorder(stream);
		currentRecoder.addEventListener('dataavailable', event => { 
    		dispatch("recordComplete", URL.createObjectURL(event.data));
		});
		currentRecoder.start();
		recordingInProgress = true;
	}

	function stopRecording() {				
		currentRecoder.stream.getTracks().forEach(track => track.stop());
		currentRecoder.stop();
		recordingInProgress = false;
	}
</script>

<main>
	<div class="record" 
		class:active={recordingInProgress} 
		on:touchstart="{event => {startRecording(); event.preventDefault();}}" 
		on:touchend="{stopRecording}" 
		on:mousedown="{startRecording}"
		on:mouseup="{stopRecording}"
		on:mouseleave="{stopRecording}"
	>
		<span class="button-text">hold to record</span>
	</div>

</main>

<style>
	.record {
		background-color: gray;
		border-radius: 50%;
		width: 5em;
      	height: 5em;
		display: inline-block;
	}

    .record:active {
    	background-color: red;
		cursor: pointer;
    }

	.button-text {
		vertical-align: middle;
		display: inline-block;
	}

	/* CSS, seriously, WTF is this */
	.record::after { 
		content: ""; 
   		display: inline-block;
    	vertical-align: middle;
    	height: 100%;
	}
</style>