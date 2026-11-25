export type SpeakFailReason = 'unsupported' | 'error'

export type SpeakVoice = {
  lang: string
  name: string
}

export type SpeakUtterance = {
  text: string
  lang: string
  rate: number
  voice: SpeakVoice | null
  onerror: ((event: { error?: string }) => void) | null
}

export type SpeakSynth = {
  getVoices(): SpeakVoice[]
  cancel(): void
  speak(utterance: SpeakUtterance): void
}

export function pickZhVoice<T extends SpeakVoice>(voices: T[]): T | undefined {
  return voices.find((voice) => voice.lang.toLowerCase().startsWith('zh'))
}

export function wrapBrowserSynth(raw: SpeechSynthesis | undefined | null): SpeakSynth | null {
  if (!raw || typeof SpeechSynthesisUtterance === 'undefined') return null
  return {
    getVoices: () => [...raw.getVoices()].map((voice) => ({ lang: voice.lang, name: voice.name })),
    cancel: () => raw.cancel(),
    speak(utterance) {
      const native = new SpeechSynthesisUtterance(utterance.text)
      native.lang = utterance.lang
      native.rate = utterance.rate
      const match = raw
        .getVoices()
        .find((voice) => voice.lang === utterance.voice?.lang && voice.name === utterance.voice?.name)
      if (match) native.voice = match
      native.onerror = (event) => {
        utterance.onerror?.({ error: event.error })
      }
      raw.speak(native)
    },
  }
}

export function speakChinese(options: {
  text: string
  synth: SpeakSynth | null
  onerror?: (event: { error?: string }) => void
}): { ok: true } | { ok: false; reason: SpeakFailReason } {
  const synth = options.synth
  if (!synth) return { ok: false, reason: 'unsupported' }
  try {
    synth.cancel()
    const utterance: SpeakUtterance = {
      text: options.text,
      lang: 'zh-CN',
      rate: 0.92,
      voice: pickZhVoice(synth.getVoices()) ?? null,
      onerror: options.onerror ?? null,
    }
    synth.speak(utterance)
    return { ok: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
