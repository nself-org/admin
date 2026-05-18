# Real-Time Collaboration Features (v0.7.0)

Complete implementation of real-time collaboration features for nself-admin, including presence tracking, cursor synchronization, and operational transformation for conflict-free collaborative editing.

## Features

### 1. User Presence Tracking

Real-time tracking of online users with status indicators:

- **Online/Away/Offline status** with automatic state management
- **Current page and document tracking** - see what others are viewing
- **TTL-based cleanup** - stale presence removed after 5 minutes
- **Visual indicators** with user avatars and colored status dots

### 2. Collaborative Editing

Multi-user editing with conflict resolution:

- **Operational Transformation (OT)** - conflict-free concurrent editing
- **Real-time cursor synchronization** - see where others are typing
- **Selection highlighting** - visual feedback for remote selections
- **Typing indicators** - know when others are actively editing
- **Document locking** - prevent conflicts on critical operations

### 3. Real-Time Cursor & Selection Sync

Visual feedback for collaborative awareness:

- **Remote cursors** displayed with user names and colors
- **Selection highlighting** with transparency for readability
- **30-second TTL** for cursor positions (auto-cleanup)
- **Smooth animations** for cursor movements

## Architecture

### Database Collections

```typescript
// User Presence (TTL: 5 minutes)
userPresence: {
  userId: string
  userName: string
  status: 'online' | 'away' | 'offline'
  currentPage?: string
  currentDocument?: string
  lastSeen: Date
  metadata?: { avatarUrl?, color? }
}

// Document State (TTL: 24 hours)
documentState: {
  documentId: string
  content: string
  version: number
  lockedBy?: string
  lastModified: Date
  operations: Operation[]
}

// Collaboration Cursors (TTL: 30 seconds)
collaborationCursor: {
  userId: string
  userName: string
  documentId: string
  position: { line, column }
  selection?: { start, end }
  color: string
  lastUpdated: Date
}
```

### WebSocket Events

```typescript
// Presence Events
USER_PRESENCE = 'collab:presence'
USER_TYPING = 'collab:typing'

// Cursor Events
CURSOR_POSITION = 'collab:cursor'
TEXT_SELECTION = 'collab:selection'

// Document Events
DOCUMENT_EDIT = 'collab:edit'
DOCUMENT_LOCK = 'collab:lock'
DOCUMENT_UNLOCK = 'collab:unlock'
```

## Usage

### Presence Tracking

```tsx
import { usePresence } from '@/hooks/useCollaboration'
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'

function MyPage() {
  const { onlineUsers, updatePresence } = usePresence('my-room-id')

  useEffect(() => {
    updatePresence('online', '/my-page')
  }, [])

  return <PresenceIndicator roomId="my-room-id" currentPage="/my-page" />
}
```

### Collaborative Editing

```tsx
import { CollaborativeEditor } from '@/components/collaboration/CollaborativeEditor'

function ConfigEditor() {
  const [content, setContent] = useState('')

  return (
    <CollaborativeEditor documentId="env-file-dev" initialContent={content} onChange={setContent} />
  )
}
```

### Custom Cursor Integration

```tsx
import { useCollaborativeEditor } from '@/hooks/useCollaboration'
import { CollaborativeCursor } from '@/components/collaboration/CollaborativeCursor'

function CustomEditor() {
  const { cursors, selections, updateCursor, setTyping, applyEdit } = useCollaborativeEditor(
    'doc-id',
    'room-id'
  )

  // Update cursor on text changes
  const handleCursorMove = (line: number, column: number) => {
    updateCursor(line, column)
  }

  // Apply edits with OT
  const handleInsert = (line: number, column: number, text: string) => {
    applyEdit('insert', line, column, text)
  }

  return (
    <div className="relative">
      {cursors.map((cursor) => (
        <CollaborativeCursor key={cursor.userId} cursor={cursor} />
      ))}
      {/* Your editor UI */}
    </div>
  )
}
```

### Document Locking

```tsx
import { useDocumentLock } from '@/hooks/useCollaboration'

function ConfigPage() {
  const { isLocked, lockedBy, lockDocument, unlockDocument } = useDocumentLock('config-prod')

  const handleEdit = async () => {
    const locked = await lockDocument()
    if (locked) {
      // Edit document
      await unlockDocument()
    } else {
      alert(`Document locked by ${lockedBy}`)
    }
  }
}
```

## API Routes

### Presence API

```typescript
// GET /api/collaboration/presence
// Get list of online users

// POST /api/collaboration/presence
// Update user presence
{
  userId: string
  userName: string
  status: 'online' | 'away' | 'offline'
  currentPage?: string
  currentDocument?: string
}

// DELETE /api/collaboration/presence
// Remove user presence (on disconnect)
{
  userId: string
}
```

### Document API

```typescript
// GET /api/collaboration/document?documentId=xxx
// Get document state and operation history

// POST /api/collaboration/document
// Apply operation to document (OT)
{
  documentId: string
  userId: string
  operation: {
    type: 'insert' | 'delete' | 'replace'
    position: { line, column }
    text?: string
    length?: number
  }
  version: number
}
```

### Cursor API

```typescript
// GET /api/collaboration/cursor?documentId=xxx
// Get all cursors for document

// POST /api/collaboration/cursor
// Update cursor position
{
  userId: string
  userName: string
  documentId: string
  position: { line, column }
  selection?: { start, end }
  color: string
}

// DELETE /api/collaboration/cursor
// Remove cursor (on leave)
{
  userId: string
  documentId: string
}
```

### Lock API

```typescript
// POST /api/collaboration/lock
// Lock or unlock document
{
  documentId: string
  action: 'lock' | 'unlock'
  userId: string
}
```

## Operational Transformation (OT)

The collaborative editing system uses a simplified OT algorithm for conflict resolution:

1. **Operation Types:**
   - `insert` - Insert text at position
   - `delete` - Delete N characters from position
   - `replace` - Replace N characters with new text

2. **Version Control:**
   - Each document has a version number
   - Each operation references parent version
   - Operations are applied sequentially

3. **Conflict Resolution:**
   - Operations are applied in order
   - Concurrent operations are transformed based on version
   - Document state is always consistent

## Components

### PresenceIndicator

Shows online users with avatars and status.

```tsx
<PresenceIndicator roomId="optional-room" currentPage="/config" />
```

### CollaborativeEditor

Full-featured collaborative text editor.

```tsx
<CollaborativeEditor
  documentId="unique-doc-id"
  initialContent={content}
  onChange={handleChange}
  readOnly={false}
  placeholder="Start typing..."
/>
```

### CollaborativeCursor

Displays remote user cursor.

```tsx
<CollaborativeCursor cursor={cursorData} editorRef={editorRef} />
```

### CollaborativeSelection

Highlights remote user selection.

```tsx
<CollaborativeSelection selection={selectionData} editorRef={editorRef} />
```

### TypingIndicator

Shows who is currently typing.

```tsx
<TypingIndicator typingUsers={['John', 'Sarah']} />
```

## Performance

- **Cursor updates** batched with 100ms max wait time
- **Typing indicators** debounced with 1-second timeout
- **Presence cleanup** runs every minute (TTL check)
- **Cursor cleanup** runs every 10 seconds (TTL check)
- **Document history** expires after 24 hours

## Security Considerations

1. **Session Validation:** All WebSocket events should validate user sessions
2. **Rate Limiting:** Implement rate limits on cursor and edit events
3. **Input Validation:** Sanitize all operation data
4. **Authorization:** Check document access permissions before operations
5. **CORS:** Restrict WebSocket origins in production

## Future Enhancements

- [ ] Voice/video chat integration
- [ ] Advanced OT with operation transformation algorithms (like Google Docs)
- [ ] Document versioning and history playback
- [ ] Presence awareness for specific regions (e.g., "3 users editing line 45")
- [ ] Collaborative drawing/diagramming tools
- [ ] Comment threads and annotations
- [ ] Undo/redo synchronization across users

## Testing

```bash
# Test presence tracking
curl http://localhost:3021/api/collaboration/presence

# Test document state
curl "http://localhost:3021/api/collaboration/document?documentId=test"

# Test cursor positions
curl "http://localhost:3021/api/collaboration/cursor?documentId=test"
```

## Troubleshooting

### Cursors not showing

- Ensure WebSocket is connected
- Check that documentId matches across users
- Verify cursor TTL hasn't expired

### Operations not applying

- Check document version numbers
- Ensure operation format is correct
- Verify WebSocket broadcast is working

### Presence not updating

- Check presence TTL (5 minutes)
- Verify WebSocket connection
- Check for JavaScript errors in console
