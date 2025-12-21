"use client"

import * as React from "react"
import {
    AlertCircle,
    Archive,
    ArchiveX,
    File,
    Inbox,
    MessagesSquare,
    PenBox,
    Send,
    ShoppingCart,
    Star,
    Trash2,
    Users2,
} from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip"

import { ComposeDialog } from "@/components/compose-dialog"
import { useI18n } from "@/contexts/i18n-context"
import { Folder } from "@/services/email-service"

interface NavLink {
    title: string
    label?: string
    icon: React.ComponentType<{ className?: string }>
    folder: Folder
}

interface AppSidebarProps {
    isCollapsed: boolean
    currentFolder: Folder
    unreadCounts: Record<Folder, number>
    onFolderChange: (folder: Folder) => void
    className?: string
}

export function AppSidebar({ 
    isCollapsed, 
    currentFolder,
    unreadCounts,
    onFolderChange,
    className 
}: AppSidebarProps) {
    const { t } = useI18n()

    const mainLinks: NavLink[] = [
        {
            title: t.mail.inbox,
            label: unreadCounts.inbox > 0 ? unreadCounts.inbox.toString() : undefined,
            icon: Inbox,
            folder: 'inbox',
        },
        {
            title: t.mail.drafts,
            label: unreadCounts.drafts > 0 ? unreadCounts.drafts.toString() : undefined,
            icon: File,
            folder: 'drafts',
        },
        {
            title: t.mail.sent,
            icon: Send,
            folder: 'sent',
        },
        {
            title: t.mail.starred,
            icon: Star,
            folder: 'starred',
        },
        {
            title: t.mail.spam,
            label: unreadCounts.spam > 0 ? unreadCounts.spam.toString() : undefined,
            icon: ArchiveX,
            folder: 'spam',
        },
        {
            title: t.mail.trash,
            icon: Trash2,
            folder: 'trash',
        },
        {
            title: t.mail.archive,
            icon: Archive,
            folder: 'archive',
        },
    ]

    const categoryLinks: NavLink[] = [
        {
            title: t.mail.important,
            label: unreadCounts.important > 0 ? unreadCounts.important.toString() : undefined,
            icon: AlertCircle,
            folder: 'important',
        },
        {
            title: t.mail.social,
            label: unreadCounts.social > 0 ? unreadCounts.social.toString() : undefined,
            icon: Users2,
            folder: 'social',
        },
        {
            title: t.mail.updates,
            label: unreadCounts.updates > 0 ? unreadCounts.updates.toString() : undefined,
            icon: MessagesSquare,
            folder: 'updates',
        },
        {
            title: t.mail.promotions,
            label: unreadCounts.promotions > 0 ? unreadCounts.promotions.toString() : undefined,
            icon: ShoppingCart,
            folder: 'promotions',
        },
    ]

    return (
        <div className={cn("flex flex-col h-full py-2", className)}>
            <div className={cn("flex items-center px-2", isCollapsed ? "justify-center" : "justify-start px-4")}>
                <ComposeDialog>
                    <Button 
                        variant="default" 
                        size={isCollapsed ? "icon" : "lg"} 
                        className={cn("w-full", isCollapsed && "h-9 w-9")}
                    >
                        <PenBox className="h-4 w-4" />
                        {!isCollapsed && <span className="ml-2">{t.mail.compose}</span>}
                    </Button>
                </ComposeDialog>
            </div>
            <Separator className="my-4" />
            
            {/* Main navigation */}
            <TooltipProvider>
                <div
                    data-collapsed={isCollapsed}
                    className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
                >
                    <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
                        {mainLinks.map((link, index) =>
                            isCollapsed ? (
                                <Tooltip key={index} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => onFolderChange(link.folder)}
                                            className={cn(
                                                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                                "h-9 w-9",
                                                currentFolder === link.folder
                                                    ? "bg-primary text-primary-foreground shadow hover:bg-primary/90"
                                                    : "hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <link.icon className="h-4 w-4" />
                                            <span className="sr-only">{link.title}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="flex items-center gap-4">
                                        {link.title}
                                        {link.label && (
                                            <span className="ml-auto text-muted-foreground">
                                                {link.label}
                                            </span>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <button
                                    key={index}
                                    onClick={() => onFolderChange(link.folder)}
                                    className={cn(
                                        "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                        "h-9 px-4 py-2 justify-start",
                                        currentFolder === link.folder
                                            ? "bg-primary text-primary-foreground shadow hover:bg-primary/90"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.title}
                                    {link.label && (
                                        <span
                                            className={cn(
                                                "ml-auto",
                                                currentFolder === link.folder && "text-primary-foreground"
                                            )}
                                        >
                                            {link.label}
                                        </span>
                                    )}
                                </button>
                            )
                        )}
                    </nav>
                </div>
            </TooltipProvider>
            
            <Separator className="my-4" />
            
            {/* Category navigation */}
            <TooltipProvider>
                <div
                    data-collapsed={isCollapsed}
                    className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
                >
                    <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
                        {categoryLinks.map((link, index) =>
                            isCollapsed ? (
                                <Tooltip key={index} delayDuration={0}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => onFolderChange(link.folder)}
                                            className={cn(
                                                "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                                "h-9 w-9",
                                                currentFolder === link.folder
                                                    ? "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"
                                                    : "hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <link.icon className="h-4 w-4" />
                                            <span className="sr-only">{link.title}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="flex items-center gap-4">
                                        {link.title}
                                        {link.label && (
                                            <span className="ml-auto text-muted-foreground">
                                                {link.label}
                                            </span>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <button
                                    key={index}
                                    onClick={() => onFolderChange(link.folder)}
                                    className={cn(
                                        "inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                                        "h-9 px-4 py-2 justify-start",
                                        currentFolder === link.folder
                                            ? "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.title}
                                    {link.label && (
                                        <span className="ml-auto text-muted-foreground">
                                            {link.label}
                                        </span>
                                    )}
                                </button>
                            )
                        )}
                    </nav>
                </div>
            </TooltipProvider>
        </div>
    )
}
