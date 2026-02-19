import { useEffect, useRef, useState } from 'react'
import { useNotesStore } from '../../../store/useNotesStore'
import { useSettingsStore } from '../../../store/useSettingsStore'
import Masonry from '@mui/lab/Masonry'
import { ArrowUp, Grid, Rows, Search, X, Microphone, Refresh } from '@mynaui/icons-react'
import { Note } from '../../ui/note'
import { StatusIndicator } from '../../ui/status-indicator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog'
import { Button } from '../../ui/button'
import { ItoMode } from '@/app/generated/ito_pb'
import { getKeyDisplayInfo } from '@/lib/types/keyboard'
import { usePlatform } from '@/app/hooks/usePlatform'

export default function NotesContent() {
  const { notes, loadNotes, addNote, deleteNote, updateNote } = useNotesStore()
  const { getItoModeShortcuts } = useSettingsStore()
  const keyboardShortcut = getItoModeShortcuts(ItoMode.TRANSCRIBE)[0].keys
  const [creatingNote, setCreatingNote] = useState(false)
  const [showAddNoteButton, setShowAddNoteButton] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const [containerHeight, setContainerHeight] = useState(128) // 128px = h-32
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState<number | null>(null)
  const [statusIndicator, setStatusIndicator] = useState<
    'success' | 'error' | null
  >(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [editingNote, setEditingNote] = useState<{
    id: string
    content: string
  } | null>(null)
  const [editContent, setEditContent] = useState('')
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)
  const platform = usePlatform()

  useEffect(() => {
    loadNotes()
  }, [loadNotes, addNote, notes.length])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) {
      return content
    }
    return content.slice(0, maxLength) + '...'
  }

  const handleBlur = () => {
    // If the note isn't empty, don't close the input
    setTimeout(() => {
      if (textareaRef.current?.value.trim() === '') {
        setCreatingNote(false)
      }
    }, 200)
  }

  const updateNoteContent = (content: string) => {
    setNoteContent(content)
    const fmt = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      hour12: false,
    })

    const timestamp = fmt.format(new Date())
    if (content.trim() !== '') {
      setShowAddNoteButton(true)
    } else {
      setShowAddNoteButton(false)
    }

    // Auto-resize textarea and container
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${scrollHeight}px`

      // Calculate container height: textarea height + padding + button space
      const minHeight = 192 // min-h-48 = 192px
      const paddingAndButton = 48 + 40 // 48px padding + 40px for button space
      const newContainerHeight = Math.max(
        minHeight,
        scrollHeight + paddingAndButton,
      )
      setContainerHeight(newContainerHeight)
    }
  }

  const toggleViewMode = () => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
  }

  const openSearch = () => {
    setShowSearch(true)
    // Focus the search input after the component updates
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 100)
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearchQuery('')
  }

  // Filter notes based on search query
  const filteredNotes =
    searchQuery.trim() === ''
      ? notes
      : notes.filter(note =>
          note.content.toLowerCase().includes(searchQuery.toLowerCase()),
        )

  const handleAddNote = async () => {
    if (noteContent.trim() !== '') {
      try {
        await addNote(noteContent.trim())
        setNoteContent('')
        setCreatingNote(false)
        setShowAddNoteButton(false)
        setStatusMessage('Note saved')
        setStatusIndicator('success')
      } catch (error) {
        console.error('Failed to add note:', error)
        setStatusMessage('Failed to save note')
        setStatusIndicator('error')
      }
    }
  }

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setShowDropdown(null)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId)
      setShowDropdown(null)
      setStatusMessage('Deleted note')
      setStatusIndicator('success')
    } catch (error) {
      console.error('Failed to delete note:', error)
      setStatusMessage('Failed to delete note')
      setStatusIndicator('error')
    }
  }

  const handleEditNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (note) {
      setEditingNote({ id: noteId, content: note.content })
      setEditContent(note.content)
      setShowDropdown(null)
      // Focus the textarea after the dialog opens
      setTimeout(() => {
        editTextareaRef.current?.focus()
      }, 100)
    }
  }

  const handleSaveEdit = async () => {
    if (editingNote && editContent.trim() !== '') {
      try {
        await updateNote(editingNote.id, editContent.trim())
        setEditingNote(null)
        setEditContent('')
        setStatusMessage('Updated note')
        setStatusIndicator('success')
      } catch (error) {
        console.error('Failed to update note:', error)
        setStatusMessage('Failed to update note')
        setStatusIndicator('error')
      }
    }
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditContent('')
  }

  // Handle keyboard shortcuts in edit dialog
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const toggleDropdown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDropdown(showDropdown === index ? null : index)
  }

  // Auto-resize on mount and when creatingNote changes
  useEffect(() => {
    if (creatingNote && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${scrollHeight}px`

      // Set container height for creating state
      const minHeight = 192 // min-h-48 = 192px
      const paddingAndButton = 48 // 48px padding for button space
      const newContainerHeight = Math.max(
        minHeight,
        scrollHeight + paddingAndButton,
      )
      setContainerHeight(newContainerHeight)
    } else if (!creatingNote) {
      // Reset to default height when not creating
      setContainerHeight(128) // h-32 = 128px
      if (textareaRef.current) {
        textareaRef.current.style.height = ''
      }
    }
  }, [creatingNote])

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop
        setShowScrollToTop(scrollTop > 200) // Show button after scrolling 200px
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll)
      return () => container.removeEventListener('scroll', handleScroll)
    }

    return () => {}
  }, [])

  // Handle escape key for closing search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSearch) {
        closeSearch()
      }
    }

    if (showSearch) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }

    return () => {}
  }, [showSearch])

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null)
    }

    if (showDropdown !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }

    return () => {}
  }, [showDropdown])

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col px-12 overflow-y-auto relative"
      style={{
        height: '640px',
        msOverflowStyle: 'none' /* Internet Explorer 10+ */,
        scrollbarWidth: 'none' /* Firefox */,
      }}
    >
      {/* Header */}
      {showSearch ? (
        <div className="flex items-center gap-4 mb-8 px-4 py-2 bg-[var(--color-surface)] border border-[var(--border)] rounded-xl">
          <Search className="w-5 h-5 text-[var(--color-subtext)] flex-shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search your notes"
            className="flex-1 text-sm outline-none placeholder-warm-400 bg-transparent"
          />
          <button
            onClick={closeSearch}
            className="p-1 hover:bg-[var(--color-muted-bg)] rounded transition-colors flex-shrink-0"
            title="Close search"
          >
            <X className="w-5 h-5 text-[var(--color-subtext)]" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-bold text-lg text-center w-full font-sans">For quick thoughts you want to come back to</h1>
        </div>
      )}

      {/* Voice Input / Text Input Area - Only show when not searching */}
      {!showSearch && !creatingNote && (
        <div
          className="w-full max-w-2xl mx-auto mt-6 mb-8 cursor-pointer"
          onClick={() => {
            setContainerHeight(128)
            setCreatingNote(true)
          }}
        >
          <div className="flex items-center justify-between p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--border)] shadow-[var(--shadow-soft)] hover:shadow-soft transition-shadow">
            <span className="text-[var(--color-subtext)] text-sm">Take a quick note with your voice</span>
            <div
              className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-[0_6px_14px_rgba(31,31,31,0.08)] hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(31,31,31,0.12)] transition-all duration-180 focus:outline-none focus:ring-3 focus:ring-[rgba(31,31,31,0.12)]"
              aria-label="Start voice note"
            >
              <Microphone className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      )}
      {!showSearch && creatingNote && (
        <div
          className="shadow-lg rounded-[var(--radius-lg)] mb-8 border border-[var(--border)] w-3/5 mx-auto transition-all duration-200 ease-in-out relative"
          style={{ height: `${containerHeight}px` }}
        >
          <textarea
            ref={textareaRef}
            className="w-full pt-6 px-6 focus:outline-none resize-none overflow-hidden cursor-text"
            value={noteContent}
            onChange={e => updateNoteContent(e.target.value)}
            onBlur={handleBlur}
            placeholder={`Press and hold ${keyboardShortcut.map(k => getKeyDisplayInfo(k, platform).label).join(' + ')} and start speaking`}
            autoFocus
          />
          {showAddNoteButton && (
            <div className="absolute bottom-3 right-3">
              <button
                onClick={handleAddNote}
                className="bg-[var(--color-muted-bg)] px-4 py-2 rounded-lg font-semibold hover:bg-warm-200 cursor-pointer"
              >
                Add note
              </button>
            </div>
          )}
        </div>
      )}
      <div
        className={`${viewMode === 'grid' || showSearch ? '' : 'm-auto w-3/5'}`}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xs font-semibold tracking-[1px] uppercase text-[var(--color-subtext)]">
            {showSearch
              ? `Search Results (${filteredNotes.length})`
              : 'Recents'}
          </h2>
          <div className="flex items-center gap-1">
            <button
              className="p-2 hover:bg-[var(--color-muted-bg)] rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              title="Search"
              aria-label="Search notes"
              onClick={openSearch}
            >
              <Search className="w-5 h-5 text-[var(--color-subtext)] hover:text-[var(--color-text)]" />
            </button>
            <button
              className="p-2 hover:bg-[var(--color-muted-bg)] rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              title="List view"
              aria-label="Grid view"
              onClick={toggleViewMode}
            >
              {viewMode === 'grid' ? (
                <Rows className="w-5 h-5 text-[var(--color-subtext)] hover:text-[var(--color-text)]" />
              ) : (
                <Grid className="w-5 h-5 text-[var(--color-subtext)] hover:text-[var(--color-text)]" />
              )}
            </button>
            <button
              className="p-2 hover:bg-[var(--color-muted-bg)] rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              title="Refresh"
              aria-label="Refresh"
              onClick={loadNotes}
            >
              <Refresh className="w-5 h-5 text-[var(--color-subtext)] hover:text-[var(--color-text)]" />
            </button>
          </div>
        </div>
        <div className="w-full h-[1px] bg-[var(--border)] mb-4"></div>
        {/* Notes Masonry Layout */}
        {(showSearch ? filteredNotes.length === 0 : notes.length === 0) ? (
          <div className="py-4 text-[var(--color-subtext)]">
            {showSearch ? (
              <>
                <p className="text-sm">No notes found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="text-sm">No notes yet</p>
              </>
            )}
          </div>
        ) : (
          <div className="py-4">
            {viewMode === 'grid' && (
              <Masonry columns={{ xs: 1, sm: 2, md: 2 }} spacing={3}>
                {(showSearch ? filteredNotes : notes).map((note, index) => (
                  <Note
                    key={note.id}
                    note={note}
                    index={index}
                    showDropdown={showDropdown}
                    onEdit={handleEditNote}
                    onToggleDropdown={toggleDropdown}
                    onCopyToClipboard={handleCopyToClipboard}
                    onDeleteNote={handleDeleteNote}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    truncateContent={truncateContent}
                    searchQuery={showSearch ? searchQuery : undefined}
                  />
                ))}
              </Masonry>
            )}
            {viewMode === 'list' && (
              <div className="flex flex-col gap-4">
                {(showSearch ? filteredNotes : notes).map((note, index) => (
                  <Note
                    key={note.id}
                    note={note}
                    index={index}
                    showDropdown={showDropdown}
                    onEdit={handleEditNote}
                    onToggleDropdown={toggleDropdown}
                    onCopyToClipboard={handleCopyToClipboard}
                    onDeleteNote={handleDeleteNote}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    truncateContent={truncateContent}
                    searchQuery={showSearch ? searchQuery : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 bg-black text-white right-8 w-8 h-8 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex items-center justify-center group z-50 cursor-pointer"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 font-bold" />
        </button>
      )}

      {/* Edit Note Dialog */}
      <Dialog
        open={!!editingNote}
        onOpenChange={open => !open && handleCancelEdit()}
      >
        <DialogContent
          className="!border-0 shadow-lg p-0"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">Edit Note</DialogTitle>
          </DialogHeader>
          <div>
            <textarea
              ref={editTextareaRef}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full px-4 rounded-md resize-none focus:outline-none border-0"
              rows={6}
              placeholder="Edit your note..."
            />
          </div>
          <DialogFooter className="p-4">
            <Button
              className="bg-[var(--color-muted-bg)] hover:bg-warm-200 text-[var(--color-text)] cursor-pointer"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleSaveEdit}
              disabled={!editContent.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Indicator */}
      <StatusIndicator
        status={statusIndicator}
        onHide={() => {
          setStatusIndicator(null)
          setStatusMessage('')
        }}
        successMessage={statusMessage}
        errorMessage={statusMessage}
      />
    </div>
  )
}
