import {
  DictionaryTable,
  InteractionsTable,
  KeyValueStore,
  NotesTable,
} from './sqlite/repo'
import { grpcClient } from '../clients/grpcClient'
import { Note, Interaction, DictionaryItem } from './sqlite/models'
import mainStore from './store'
import { STORE_KEYS } from '../constants/store-keys'
import type { AdvancedSettings } from './store'
import { mainWindow } from './app'

/**
 * Execute async tasks with a concurrency limit.
 * Returns results in the same order as input.
 */
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = []
  let index = 0

  async function runNext(): Promise<void> {
    while (index < tasks.length) {
      const currentIndex = index++
      try {
        const value = await tasks[currentIndex]()
        results[currentIndex] = { status: 'fulfilled', value }
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => runNext(),
  )
  await Promise.all(workers)
  return results
}

const SYNC_CONCURRENCY = 5

const LAST_SYNCED_AT_KEY = 'lastSyncedAt'

function getEnvNamespace(): string {
  const baseUrl = (import.meta.env?.VITE_GRPC_BASE_URL as string) || ''
  try {
    const url = new URL(baseUrl)
    return url.host || baseUrl || 'unknown'
  } catch {
    return baseUrl || 'unknown'
  }
}

function getLastSyncedAtKey(userId: string): string {
  const envNs = getEnvNamespace()
  return `${LAST_SYNCED_AT_KEY}:${envNs}:${userId}`
}

export class SyncService {
  private isSyncing = false
  private syncInterval: NodeJS.Timeout | null = null
  private static instance: SyncService

  private constructor() {
    // Private constructor to ensure singleton pattern
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService()
    }
    return SyncService.instance
  }

  public async start() {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Initial sync on startup, then schedule periodic syncs
    await this.runSync()
    this.syncInterval = setInterval(() => this.runSync(), 1000 * 30) // Sync every 30 seconds
  }

  public stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    this.isSyncing = false
  }

  private async runSync() {
    if (this.isSyncing) {
      return
    }

    this.isSyncing = true

    try {
      const user = mainStore.get(STORE_KEYS.USER_PROFILE) as any
      if (!user?.id) {
        console.log(
          'No user logged in or user profile is missing ID. Skipping sync.',
        )
        this.isSyncing = false
        return
      }

      const lastSyncedAtKey = getLastSyncedAtKey(user.id)
      const lastSyncedAt =
        (await KeyValueStore.get(lastSyncedAtKey)) || new Date(0).toISOString()

      // =================================================================
      // PUSH LOCAL CHANGES — in parallel
      // =================================================================
      const [pushNotes, pushInteractions, pushDict] = await Promise.all([
        this.pushNotes(lastSyncedAt),
        this.pushInteractions(lastSyncedAt),
        this.pushDictionaryItems(lastSyncedAt),
      ])
      let processedChanges = pushNotes + pushInteractions + pushDict

      // =================================================================
      // PULL REMOTE CHANGES — in parallel (after push completes)
      // =================================================================
      const [pullNotes, pullInteractions, pullDict] = await Promise.all([
        this.pullNotes(lastSyncedAt),
        this.pullInteractions(lastSyncedAt),
        this.pullDictionaryItems(lastSyncedAt),
      ])
      processedChanges += pullNotes + pullInteractions + pullDict

      // =================================================================
      // SYNC ADVANCED SETTINGS
      // =================================================================
      await this.syncAdvancedSettings(lastSyncedAt)

      if (processedChanges > 0) {
        const newSyncTimestamp = new Date().toISOString()
        await KeyValueStore.set(lastSyncedAtKey, newSyncTimestamp)
      }
    } catch (error) {
      console.error('Sync cycle failed:', error)
    } finally {
      this.isSyncing = false
    }
  }

  private async pushNotes(lastSyncedAt: string): Promise<number> {
    const modifiedNotes = await NotesTable.findModifiedSince(lastSyncedAt)
    if (modifiedNotes.length === 0) return 0

    const tasks = modifiedNotes.map((note) => () => {
      if (new Date(note.created_at) > new Date(lastSyncedAt)) {
        return grpcClient.createNote(note)
      } else if (note.deleted_at) {
        return grpcClient.deleteNote(note)
      } else {
        return grpcClient.updateNote(note)
      }
    })

    const results = await parallelLimit(tasks, SYNC_CONCURRENCY)
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.error(
          `Failed to push note ${modifiedNotes[i].id}:`,
          (results[i] as PromiseRejectedResult).reason,
        )
      }
    }
    return modifiedNotes.length
  }

  private async pushInteractions(lastSyncedAt: string): Promise<number> {
    const modifiedInteractions =
      await InteractionsTable.findModifiedSince(lastSyncedAt)
    if (modifiedInteractions.length === 0) return 0

    const tasks = modifiedInteractions.map((interaction) => () => {
      if (new Date(interaction.created_at) > new Date(lastSyncedAt)) {
        return grpcClient.createInteraction(interaction)
      } else if (interaction.deleted_at) {
        return grpcClient.deleteInteraction(interaction)
      } else {
        return grpcClient.updateInteraction(interaction)
      }
    })

    const results = await parallelLimit(tasks, SYNC_CONCURRENCY)
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.error(
          `Failed to push interaction ${modifiedInteractions[i].id}:`,
          (results[i] as PromiseRejectedResult).reason,
        )
      }
    }
    return modifiedInteractions.length
  }

  private async pushDictionaryItems(lastSyncedAt: string): Promise<number> {
    const modifiedItems = await DictionaryTable.findModifiedSince(lastSyncedAt)
    if (modifiedItems.length === 0) return 0

    const tasks = modifiedItems.map((item) => () => {
      if (new Date(item.created_at) > new Date(lastSyncedAt)) {
        return grpcClient.createDictionaryItem(item)
      } else if (item.deleted_at) {
        return grpcClient.deleteDictionaryItem(item)
      } else {
        return grpcClient.updateDictionaryItem(item)
      }
    })

    const results = await parallelLimit(tasks, SYNC_CONCURRENCY)
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.error(
          `Failed to push dictionary item ${modifiedItems[i].id}:`,
          (results[i] as PromiseRejectedResult).reason,
        )
      }
    }
    return modifiedItems.length
  }

  private async pullNotes(lastSyncedAt?: string): Promise<number> {
    const remoteNotes = await grpcClient.listNotesSince(lastSyncedAt)
    if (remoteNotes.length > 0) {
      for (const remoteNote of remoteNotes) {
        if (remoteNote.deletedAt) {
          await NotesTable.softDelete(remoteNote.id)
          continue
        }
        const localNote: Note = {
          id: remoteNote.id,
          user_id: remoteNote.userId,
          interaction_id: remoteNote.interactionId || null,
          content: remoteNote.content,
          created_at: remoteNote.createdAt,
          updated_at: remoteNote.updatedAt,
          deleted_at: remoteNote.deletedAt || null,
        }
        await NotesTable.upsert(localNote)
      }
    }
    return remoteNotes.length
  }

  private async pullInteractions(lastSyncedAt?: string): Promise<number> {
    const remoteInteractions =
      await grpcClient.listInteractionsSince(lastSyncedAt)
    if (remoteInteractions.length > 0) {
      for (const remoteInteraction of remoteInteractions) {
        if (remoteInteraction.deletedAt) {
          await InteractionsTable.softDelete(remoteInteraction.id)
          continue
        }

        // Convert Uint8Array back to Buffer
        let audioBuffer: Buffer | null = null
        if (
          remoteInteraction.rawAudio &&
          remoteInteraction.rawAudio.length > 0
        ) {
          audioBuffer = Buffer.from(
            remoteInteraction.rawAudio.buffer,
            remoteInteraction.rawAudio.byteOffset,
            remoteInteraction.rawAudio.byteLength,
          )
        }

        const localInteraction: Interaction = {
          id: remoteInteraction.id,
          user_id: remoteInteraction.userId || null,
          title: remoteInteraction.title || null,
          asr_output: remoteInteraction.asrOutput
            ? JSON.parse(remoteInteraction.asrOutput)
            : null,
          llm_output: remoteInteraction.llmOutput
            ? JSON.parse(remoteInteraction.llmOutput)
            : null,
          raw_audio: audioBuffer,
          duration_ms: remoteInteraction.durationMs || 0,
          created_at: remoteInteraction.createdAt,
          updated_at: remoteInteraction.updatedAt,
          deleted_at: remoteInteraction.deletedAt || null,
          raw_audio_id: remoteInteraction.rawAudioId,
          sample_rate: null,
        }
        await InteractionsTable.upsert(localInteraction)
      }
    }
    return remoteInteractions.length
  }

  private async pullDictionaryItems(lastSyncedAt?: string): Promise<number> {
    const remoteItems = await grpcClient.listDictionaryItemsSince(lastSyncedAt)
    if (remoteItems.length > 0) {
      for (const remoteItem of remoteItems) {
        if (remoteItem.deletedAt) {
          await DictionaryTable.softDelete(remoteItem.id)
          continue
        }
        const localItem: DictionaryItem = {
          id: remoteItem.id,
          user_id: remoteItem.userId,
          word: remoteItem.word,
          pronunciation: remoteItem.pronunciation || null,
          created_at: remoteItem.createdAt,
          updated_at: remoteItem.updatedAt,
          deleted_at: remoteItem.deletedAt || null,
        }
        await DictionaryTable.upsert(localItem)
      }
    }
    return remoteItems.length
  }

  private async syncAdvancedSettings(lastSyncedAt?: string) {
    try {
      // Get remote advanced settings
      const remoteSettings = await grpcClient.getAdvancedSettings()
      if (!remoteSettings) {
        console.warn('No remote advanced settings found, skipping sync.')
        return
      }

      // Always update local defaults
      const defaultSettings = remoteSettings.default
      if (defaultSettings) {
        const currentLocalSettings = mainStore.get(
          STORE_KEYS.ADVANCED_SETTINGS,
        ) as AdvancedSettings
        mainStore.set(STORE_KEYS.ADVANCED_SETTINGS, {
          ...currentLocalSettings,
          defaults: defaultSettings,
        })

        // Notify UI of the update
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send('advanced-settings-updated')
        }
      }

      // Compare timestamps to determine sync direction
      const remoteUpdatedAt = new Date(remoteSettings.updatedAt)
      const lastSyncTime = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0)

      // If remote settings were updated after last sync, pull them to local
      if (remoteUpdatedAt > lastSyncTime) {
        // Get current local settings to preserve local-only fields
        const currentLocalSettings = mainStore.get(
          STORE_KEYS.ADVANCED_SETTINGS,
        ) as AdvancedSettings

        const updatedLocalSettings: AdvancedSettings = {
          llm: {
            asrProvider: remoteSettings.llm?.asrProvider ?? null,
            asrModel: remoteSettings.llm?.asrModel ?? null,
            asrPrompt: remoteSettings.llm?.asrPrompt ?? null,
            llmProvider: remoteSettings.llm?.llmProvider ?? null,
            llmModel: remoteSettings.llm?.llmModel ?? null,
            llmTemperature: remoteSettings.llm?.llmTemperature ?? null,
            transcriptionPrompt:
              remoteSettings.llm?.transcriptionPrompt ?? null,
            editingPrompt: remoteSettings.llm?.editingPrompt ?? null,
            noSpeechThreshold: remoteSettings.llm?.noSpeechThreshold ?? null,
          },
          // Preserve local-only settings that aren't synced to the server
          grammarServiceEnabled:
            currentLocalSettings?.grammarServiceEnabled ?? false,
          // Preserve defaults that were set earlier in this function
          defaults: currentLocalSettings?.defaults,
          macosAccessibilityContextEnabled:
            currentLocalSettings.macosAccessibilityContextEnabled ?? false,
        }

        // Update local store
        mainStore.set(STORE_KEYS.ADVANCED_SETTINGS, updatedLocalSettings)
        // Notify UI of the update
        if (
          mainWindow &&
          !mainWindow.isDestroyed() &&
          !mainWindow.webContents.isDestroyed()
        ) {
          mainWindow.webContents.send('advanced-settings-updated')
        }
      }
      // Note: We don't push local changes to server in this implementation
      // since advanced settings are typically managed through the UI which
      // directly calls the server API. This sync is primarily for pulling
      // changes made on other devices or through other clients.
    } catch (error) {
      console.error('Failed to sync advanced settings:', error)
    }
  }
}

export const syncService = SyncService.getInstance()
