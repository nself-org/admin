'use client'

/**
 * Sidebar component - Side navigation component
 *
 * @example
 * ```tsx
 * <Sidebar>
 *   <SidebarHeader>
 *     <h2>Navigation</h2>
 *   </SidebarHeader>
 *   <SidebarContent>
 *     <SidebarGroup>
 *       <SidebarGroupLabel>Main</SidebarGroupLabel>
 *       <SidebarGroupContent>
 *         <SidebarMenu>
 *           <SidebarMenuItem>
 *             <SidebarMenuButton href="/">Dashboard</SidebarMenuButton>
 *           </SidebarMenuItem>
 *         </SidebarMenu>
 *       </SidebarGroupContent>
 *     </SidebarGroup>
 *   </SidebarContent>
 * </Sidebar>
 * ```
 */

import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import * as React from 'react'

interface SidebarContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SidebarProvider({
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
}: SidebarProviderProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const [isMobile, setIsMobile] = React.useState(false)

  const open = controlledOpen ?? internalOpen
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) {
        setInternalOpen(value)
      }
      onOpenChange?.(value)
    },
    [controlledOpen, onOpenChange]
  )

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <SidebarContext.Provider value={{ open, setOpen, isMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, children, ...props }, ref) => {
    const { open, isMobile } = useSidebar()

    if (isMobile) {
      return (
        <Sheet open={open} onOpenChange={() => {}}>
          <SheetContent side="left" className="p-0">
            <div ref={ref} className={cn('flex h-full flex-col', className)} {...props}>
              {children}
            </div>
          </SheetContent>
        </Sheet>
      )
    }

    return (
      <aside
        ref={ref}
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'bg-background flex h-screen flex-col border-r transition-all duration-300',
          open ? 'w-64' : 'w-16',
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = 'Sidebar'

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-b px-4 py-3', className)} {...props} />
  )
)
SidebarHeader.displayName = 'SidebarHeader'

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex-1 overflow-auto py-2', className)} {...props} />
  )
)
SidebarContent.displayName = 'SidebarContent'

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('border-t px-4 py-3', className)} {...props} />
  )
)
SidebarFooter.displayName = 'SidebarFooter'

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-2 py-2', className)} {...props} />
  )
)
SidebarGroup.displayName = 'SidebarGroup'

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'text-muted-foreground mb-1 px-2 text-xs font-semibold tracking-wider uppercase',
        className
      )}
      {...props}
    />
  )
)
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<'div'>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1', className)} {...props} />
  )
)
SidebarGroupContent.displayName = 'SidebarGroupContent'

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentPropsWithoutRef<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('space-y-1', className)} {...props} />
  )
)
SidebarMenu.displayName = 'SidebarMenu'

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<'li'>>(
  ({ className, ...props }, ref) => <li ref={ref} className={className} {...props} />
)
SidebarMenuItem.displayName = 'SidebarMenuItem'

const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement | HTMLButtonElement,
  (React.ComponentPropsWithoutRef<'a'> | React.ComponentPropsWithoutRef<'button'>) & {
    href?: string
    active?: boolean
    icon?: React.ReactNode
  }
>(({ className, href, active, icon, children, ...props }, ref) => {
  const { open } = useSidebar()

  const buttonClasses = cn(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    className
  )

  if (href) {
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={buttonClasses}
        {...(props as React.ComponentPropsWithoutRef<'a'>)}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {open && <span className="truncate">{children}</span>}
      </Link>
    )
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={buttonClasses}
      {...(props as React.ComponentPropsWithoutRef<'button'>)}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {open && <span className="truncate">{children}</span>}
    </button>
  )
})
SidebarMenuButton.displayName = 'SidebarMenuButton'

const SidebarToggle = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<'button'>>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen } = useSidebar()

    return (
      <button
        ref={ref}
        onClick={() => setOpen(!open)}
        className={cn(
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md p-2 transition-colors',
          className
        )}
        aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        {...props}
      >
        {children}
      </button>
    )
  }
)
SidebarToggle.displayName = 'SidebarToggle'

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
  SidebarToggle,
  useSidebar,
}
