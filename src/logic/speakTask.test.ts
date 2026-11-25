import { describe, expect, it } from 'vitest'
import { pickZhVoice, speakChinese, zhCount, type SpeakSynth, type SpeakUtterance } from './speakTask'

function fakeSynth(options: { voices?: { lang: string; name: string }[]; failSpeak?: boolean } = {}) {
  const spoken: SpeakUtterance[] = []
  const synth: SpeakSynth & { spoken: SpeakUtterance[]; cancels: number } = {
    spoken,
    cancels: 0,
    getVoices: () => options.voices ?? [],
    cancel() {
      synth.cancels += 1
    },
    speak(utterance) {
      if (options.failSpeak) throw new Error('speak fail')
      spoken.push(utterance)
    },
  }
  return synth
}

describe('朗读任务', () => {
  it('无 speechSynthesis 直接失败', () => {
    expect(speakChinese({ text: '花园站', synth: null })).toEqual({ ok: false, reason: 'unsupported' })
  })

  it('0 个 voice 仍尝试用 zh-CN 朗读，不假装已有中文音色', () => {
    const synth = fakeSynth({ voices: [] })
    const result = speakChinese({ text: zhCount(6), synth })
    expect(result).toEqual({ ok: true })
    expect(synth.cancels).toBe(1)
    expect(synth.spoken[0]?.lang).toBe('zh-CN')
    expect(synth.spoken[0]?.text).toBe('六')
    expect(synth.spoken[0]?.voice).toBeNull()
  })

  it('有中文音色就选用', () => {
    const synth = fakeSynth({
      voices: [
        { lang: 'en-US', name: 'English' },
        { lang: 'zh-CN', name: 'Tingting' },
      ],
    })
    speakChinese({ text: '家门口站', synth })
    expect(synth.spoken[0]?.voice?.name).toBe('Tingting')
  })

  it('speak 抛错则降级', () => {
    const synth = fakeSynth({ failSpeak: true })
    expect(speakChinese({ text: '池塘站', synth })).toEqual({ ok: false, reason: 'error' })
  })

  it('数字读成中文数词', () => {
    expect(zhCount(6)).toBe('六')
    expect(zhCount(10)).toBe('十')
  })

  it('pickZhVoice 只认 zh 前缀', () => {
    expect(pickZhVoice([{ lang: 'en-GB', name: 'A' }])).toBeUndefined()
    expect(pickZhVoice([{ lang: 'zh-TW', name: 'Meijia' }])?.name).toBe('Meijia')
  })
})
