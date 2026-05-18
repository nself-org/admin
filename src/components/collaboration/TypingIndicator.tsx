/**
 * Typing Indicator Component
 * Shows who is currently typing in a collaborative document
 */
'use client'

interface TypingIndicatorProps {
  typingUsers: string[]
  className?: string
}

export function TypingIndicator({ typingUsers, className = '' }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  const getUsersText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing...`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing...`
    } else {
      return `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers.length - 2} others are typing...`
    }
  }

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <div className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
      </div>
      <span className="text-xs italic">{getUsersText()}</span>
    </div>
  )
}
