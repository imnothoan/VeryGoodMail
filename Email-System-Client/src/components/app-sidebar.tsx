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
    Search,
    Send,
    ShoppingCart,
    Trash2,
    Users2,
} from "lucide-react"

import { Nav } from "@/components/nav"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { ComposeDialog } from "@/components/compose-dialog"
import { ModeToggle } from "@/components/mode-toggle"

interface AppSidebarProps {
    isCollapsed: boolean
    className?: string
}

export function AppSidebar({ isCollapsed, className }: AppSidebarProps) {
    return (
        <div className={cn("flex flex-col h-full py-2", className)}>
            <div className={cn("flex items-center px-2", isCollapsed ? "justify-center" : "justify-start px-4")}>
                <ComposeDialog>
                    <Button variant="default" size={isCollapsed ? "icon" : "lg"} className={cn("w-full", isCollapsed && "h-9 w-9")}>
                        <PenBox className="h-4 w-4" />
                        {!isCollapsed && <span className="ml-2">Compose</span>}
                    </Button>
                </ComposeDialog>
            </div>
            <Separator className="my-4" />
            <Nav
                isCollapsed={isCollapsed}
                links={[
                    {
                        title: "Inbox",
                        label: "128",
                        icon: Inbox,
                        variant: "default",
                        href: "/inbox",
                    },
                    {
                        title: "Drafts",
                        label: "9",
                        icon: File,
                        variant: "ghost",
                        href: "/drafts",
                    },
                    {
                        title: "Sent",
                        label: "",
                        icon: Send,
                        variant: "ghost",
                        href: "/sent",
                    },
                    {
                        title: "Junk",
                        label: "23",
                        icon: ArchiveX,
                        variant: "ghost",
                        href: "/junk",
                    },
                    {
                        title: "Trash",
                        label: "",
                        icon: Trash2,
                        variant: "ghost",
                        href: "/trash",
                    },
                    {
                        title: "Archive",
                        label: "",
                        icon: Archive,
                        variant: "ghost",
                        href: "/archive",
                    },
                ]}
            />
            <Separator className="my-4" />
            <Nav
                isCollapsed={isCollapsed}
                links={[
                    {
                        title: "Social",
                        label: "972",
                        icon: Users2,
                        variant: "ghost",
                        href: "/social",
                    },
                    {
                        title: "Updates",
                        label: "342",
                        icon: AlertCircle,
                        variant: "ghost",
                        href: "/updates",
                    },
                    {
                        title: "Forums",
                        label: "128",
                        icon: MessagesSquare,
                        variant: "ghost",
                        href: "/forums",
                    },
                    {
                        title: "Promotions",
                        label: "21",
                        icon: ShoppingCart,
                        variant: "ghost",
                        href: "/promotions",
                    },
                ]}
            />
            <div className="mt-auto p-2 flex justify-center">
                <ModeToggle />
            </div>
        </div>
    )
}
