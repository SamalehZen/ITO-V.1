import startSoundUrl from '@/app/assets/sounds/recording-start.wav'
import stopSoundUrl from '@/app/assets/sounds/recording-stop.wav'

class SoundPlayer {
  private audioContext: AudioContext | null = null
  private buffers: Map<string, AudioBuffer> = new Map()

  async init() {
    if (this.audioContext) return
    this.audioContext = new AudioContext()
    await Promise.all([
      this.preload('recording-start', startSoundUrl),
      this.preload('recording-stop', stopSoundUrl),
    ])
  }

  private async preload(name: string, url: string) {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer)
      this.buffers.set(name, audioBuffer)
    } catch (error) {
      console.warn(`[SoundPlayer] Failed to preload sound "${name}":`, error)
    }
  }

  play(name: string) {
    if (!this.audioContext) return
    const buffer = this.buffers.get(name)
    if (!buffer) return
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }
    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.audioContext.destination)
    source.start(0)
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close().catch(() => {})
      this.audioContext = null
    }
    this.buffers.clear()
  }
}

export const soundPlayer = new SoundPlayer()
