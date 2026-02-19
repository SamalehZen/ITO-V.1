export type PerformanceTier = 'auto' | 'low' | 'balanced' | 'high' | 'ultra'

export interface PerformanceConfig {
  fpsCap: number
  animationDurationMultiplier: number
  enableBlur: boolean
  enableShadows: boolean
  enableParticles: boolean
  enableBackdropBlur: boolean
  enableSpringAnimations: boolean
  imageQuality: 'low' | 'medium' | 'high' | 'ultra'
  audioSampleRate: number
  lazyAggressiveness: 'aggressive' | 'moderate' | 'minimal'
  workerThreads: number
}

export interface HardwareInfo {
  ramGB: number
  cpuCores: number
  gpuScore: number
  platform: string
  cpuModel: string
}

export const TIER_CONFIGS: Record<Exclude<PerformanceTier, 'auto'>, PerformanceConfig> = {
  low: {
    fpsCap: 30,
    animationDurationMultiplier: 0,
    enableBlur: false,
    enableShadows: false,
    enableParticles: false,
    enableBackdropBlur: false,
    enableSpringAnimations: false,
    imageQuality: 'low',
    audioSampleRate: 16000,
    lazyAggressiveness: 'aggressive',
    workerThreads: 1,
  },
  balanced: {
    fpsCap: 60,
    animationDurationMultiplier: 1,
    enableBlur: true,
    enableShadows: true,
    enableParticles: false,
    enableBackdropBlur: true,
    enableSpringAnimations: true,
    imageQuality: 'medium',
    audioSampleRate: 44100,
    lazyAggressiveness: 'moderate',
    workerThreads: 2,
  },
  high: {
    fpsCap: 60,
    animationDurationMultiplier: 1,
    enableBlur: true,
    enableShadows: true,
    enableParticles: true,
    enableBackdropBlur: true,
    enableSpringAnimations: true,
    imageQuality: 'high',
    audioSampleRate: 48000,
    lazyAggressiveness: 'minimal',
    workerThreads: 4,
  },
  ultra: {
    fpsCap: 120,
    animationDurationMultiplier: 1,
    enableBlur: true,
    enableShadows: true,
    enableParticles: true,
    enableBackdropBlur: true,
    enableSpringAnimations: true,
    imageQuality: 'ultra',
    audioSampleRate: 48000,
    lazyAggressiveness: 'minimal',
    workerThreads: 8,
  },
}
