import type { Pronunciation } from "./Pronunciation";

class Phonetic {
    text: string;
    audio: string | null; //url
}

class WordMetadata {
    phonetic: string;
    phonetics: Array<Phonetic>;
}

async function getWordMeta(word: String): Promise<Array<WordMetadata>> {
    let url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`; //FIXME: sanitize
    
    try {
        const response = await fetch(url);
        return response.json();
    } catch(error) {
        console.log(error);			
        throw error			
    }
}


export async function getPronunciation(word: String): Promise<Pronunciation> {
    let wordMetadata = (await getWordMeta(word)).shift();  
    let phoneticWithAudio = wordMetadata.phonetics.find(x => x.audio && x.audio.length > 0) 
    if (phoneticWithAudio){
       return {
            phonetic: phoneticWithAudio.text,
            audio: `https://api.allorigins.win/raw?url=${encodeURIComponent('https://' + phoneticWithAudio.audio)}`
            //audio: "https://ia800301.us.archive.org/15/items/fire_and_ice_librivox/fire_and_ice_frost_apc_64kb.mp3"
        };
    } else {
        return {
            phonetic: wordMetadata.phonetic,
            audio: null
        }; 
    }
}