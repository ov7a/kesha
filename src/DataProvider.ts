import type { Pronunciation } from "./Pronunciation";

class Phonetic {
	text: string;
	audio: string | null; //url
}

class WordMetadata {
	phonetic: string;
	phonetics: Array<Phonetic>;
}

async function getWordMeta(word: string): Promise<Array<WordMetadata>> {
	let url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`;

	let response = await fetch(url)

	switch (response.status) {
		case 200: {
			return response.json();
		}
		case 404: {
			throw new Error("Not found");
		}
		default: {
			throw new Error(`Unknown error, http code ${response.status}`)
		}
	}
}


export async function getPronunciation(word: string): Promise<Pronunciation> {
	let response = await getWordMeta(word);
	let wordMetadata = response.shift();
	let phoneticWithAudio = wordMetadata.phonetics.find(x => x.audio && x.audio.length > 0)
	if (phoneticWithAudio) {
		return {
			phonetic: phoneticWithAudio.text,
			audio: `https://api.allorigins.win/raw?url=${encodeURIComponent(phoneticWithAudio.audio)}`
		};
	} else {
		return {
			phonetic: wordMetadata.phonetic,
			audio: null
		};
	}
}
