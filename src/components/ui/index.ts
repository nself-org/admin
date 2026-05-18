/**
 * UI Component Library Index
 * Central export file for all UI components
 */

// Navigation Components
export { BreadcrumbItem, BreadcrumbSeparator, Breadcrumbs } from './breadcrumbs'
export {
  CommandPalette,
  CommandPaletteEmpty,
  CommandPaletteGroup,
  CommandPaletteInput,
  CommandPaletteItem,
  CommandPaletteList,
  CommandPaletteSeparator,
  CommandPaletteShortcut,
} from './command-palette'
export { Pagination, PaginationContent, PaginationItem } from './pagination'
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarToggle,
  useSidebar,
} from './sidebar'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

// Feedback Components
export { Alert, AlertDescription, AlertTitle } from './alert'
export { ConfirmDialog } from './confirm-dialog'
export { ErrorBoundary } from './error-boundary'
export { FullPageLoader, InlineLoader, LoadingSpinner } from './loading-spinner'
export { OfflineBanner } from './offline-banner'
export { ProgressModal } from './progress-modal'
export { Toaster } from './toast'

// Form Components
export { Button } from './button'
export { Checkbox } from './checkbox'
export { ColorPicker } from './color-picker'
export { DatePicker } from './date-picker'
export { FileUpload } from './file-upload'
export { Form } from './form'
export { FormActions } from './form-actions'
export { FormField } from './form-field'
export { FormSection } from './form-section'
export { Input } from './input'
export { Label } from './label'
export { MultiSelect } from './multi-select'
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
export { Switch } from './switch'
export { Textarea } from './textarea'
export { TimePicker } from './time-picker'

// Layout Components
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

// Display Components
export { Badge } from './badge'
export { Chart } from './chart'
export { CodeEditor } from './code-editor'
export { DataTable, SortableHeader } from './data-table'
export { EmptyState } from './empty-state'
export { HealthCheck } from './health-check'
export { MarkdownEditor } from './markdown-editor'
export { Progress } from './progress'
export { ProgressBar } from './progress-bar'
export { ProgressRing } from './progress-ring'
export { ScrollArea } from './scroll-area'
export { Separator } from './separator'
export { Skeleton } from './skeleton'
export { Sparkline } from './sparkline'
export { StatCard } from './stat-card'
export { StatusIndicator } from './status-indicator'
export { Timeline, TimelineItem } from './timeline'

// New Layout Components (v0.5)
export { CardGrid } from './card-grid'
export { PageContent } from './page-content'
export { PageHeader } from './page-header'
export { ThreeColumnLayout } from './three-column-layout'
export { TwoColumnLayout } from './two-column-layout'

// Overlays (v0.5)
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer'
export {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from './modal'

// Service-Specific Components (v0.5)
export { DockerStats } from './docker-stats'
export { LogViewer } from './log-viewer'
export { ResourceUsage } from './resource-usage'
export { ServiceActions } from './service-actions'
export { TerminalOutput } from './terminal-output'
