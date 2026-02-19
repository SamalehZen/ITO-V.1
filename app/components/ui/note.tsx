import React from 'react'
import { Pencil, Copy, Trash, Dots } from '@mynaui/icons-react'
import type { Note } from '../../store/useNotesStore'

interface NoteProps {
  note: Note
  index: number
  showDropdown: number | null
  onEdit: (noteId: string) => void
  onToggleDropdown: (index: number, e: React.MouseEvent) => void
  onCopyToClipboard: (content: string) => void
  onDeleteNote: (noteId: string) => void
  formatDate: (date: Date) => string
  formatTime: (date: Date) => string
  truncateContent: (content: string, maxLength?: number) => string
  searchQuery?: string
}

// Function to highlight matching text
function highlightText(text: string, searchQuery: string): React.ReactElement {
  if (!searchQuery.trim()) {
    return <>{text}</>
  }

  const regex = new RegExp(
    `(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi',
  )
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <span key={index} className="bg-yellow-200 font-medium">
              {part}
            </span>
          )
        }
        return part
      })}
    </>
  )
}

export function Note({
  note,
  index,
  showDropdown,
  onEdit,
  onToggleDropdown,
  onCopyToClipboard,
  onDeleteNote,
  formatDate,
  formatTime,
  truncateContent,
  searchQuery,
}: NoteProps) {
  // Determine what content to display
  const displayContent = searchQuery
    ? note.content
    : truncateContent(note.content)

  return (
    <div
      key={note.id}
      className="bg-white rounded-[var(--radius-lg)] border border-[rgba(31,31,31,0.03)] p-[18px_20px] shadow-[var(--shadow-card)] group relative transition-all duration-180 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(31,31,31,0.07)]"
    >
      {/* Hover Icons */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:shadow-sm group-hover:opacity-100 transition-opacity duration-200 flex items-center rounded-md border border-[var(--border)]">
        <button
          onClick={e => {
            e.stopPropagation()
            onEdit(note.id)
          }}
          className="p-1.5 hover:bg-[var(--color-muted-bg)] transition-colors border-r border-[var(--border)] rounded-l-md cursor-pointer "
        >
          <Pencil className="w-4 h-4 text-[var(--color-subtext)]" />
        </button>
        <div className="relative">
          <button
            onClick={e => onToggleDropdown(index, e)}
            className="p-1.5 hover:bg-[var(--color-muted-bg)] transition-colors rounded-r-md cursor-pointer"
          >
            <Dots className="w-4 h-4 text-foreground" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown === index && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-soft)] z-10">
              <button
                onClick={e => {
                  e.stopPropagation()
                  onCopyToClipboard(note.content)
                }}
                className="w-full px-4 py-2 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-muted-bg)] flex items-center gap-2 rounded-t-[var(--radius-lg)] cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Copy to clipboard
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDeleteNote(note.id)
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-[var(--radius-lg)] cursor-pointer"
              >
                <Trash className="w-4 h-4" />
                Delete note
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <div className="mb-4 pr-16">
          <div className="text-[var(--color-text)] font-normal text-base leading-relaxed break-words">
            {searchQuery
              ? highlightText(displayContent, searchQuery)
              : displayContent}
          </div>
        </div>
        <div className="flex items-center justify-between text-[var(--color-subtext)] text-[13px] mt-auto">
          <span>{formatDate(new Date(note.created_at))}</span>
          <span>{formatTime(new Date(note.created_at))}</span>
        </div>
      </div>
    </div>
  )
}
