"use client"

import * as React from "react"
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable"
import { TooltipProvider } from "@/components/ui/tooltip"

import { AppSidebar } from "@/components/app-sidebar"
import { MailList } from "@/components/mail-list"
import { MailDisplay } from "@/components/mail-display"
import { Email } from "@/types"
import { Folder } from "@/services/email-service"

interface MailProps {
    mails: Email[]
    selectedMail?: Email | null
    folder: Folder
    unreadCounts: Record<Folder, number>
    loading?: boolean
    onFolderChange: (folder: Folder) => void
    onSelectMail: (mail: Email | null) => void
    onMarkAsRead?: (id: string) => Promise<void>
    onMarkAsUnread?: (id: string) => Promise<void>
    onToggleStar?: (id: string) => Promise<void>
    onMoveToTrash?: (id: string) => Promise<void>
    onMoveToSpam?: (id: string) => Promise<void>
    onSearch?: (query: string) => void
    defaultLayout?: number[] | undefined
    defaultCollapsed?: boolean
    navCollapsedSize?: number
}

export function Mail({
    mails,
    selectedMail = null,
    folder,
    unreadCounts,
    loading = false,
    onFolderChange,
    onSelectMail,
    onMarkAsRead,
    onMarkAsUnread,
    onToggleStar,
    onMoveToTrash,
    onMoveToSpam,
    onSearch,
    defaultLayout = [20, 32, 48],
    defaultCollapsed = false,
    navCollapsedSize = 4,
}: MailProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if in input/textarea
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return
            }

            if (e.key === "j" || e.key === "k") {
                e.preventDefault()
                const currentIndex = mails.findIndex((mail) => mail.id === selectedMail?.id)
                let newIndex = currentIndex

                if (e.key === "j") {
                    newIndex = Math.min(currentIndex + 1, mails.length - 1)
                } else if (e.key === "k") {
                    newIndex = Math.max(currentIndex - 1, 0)
                }

                if (newIndex !== currentIndex && newIndex >= 0 && mails[newIndex]) {
                    onSelectMail(mails[newIndex])
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [mails, selectedMail, onSelectMail])

    return (
        <TooltipProvider delayDuration={0}>
            <ResizablePanelGroup
                direction="horizontal"
                onLayout={(sizes: number[]) => {
                    document.cookie = `react-resizable-panels:layout=${JSON.stringify(
                        sizes
                    )}`
                }}
                className="h-full max-h-[800px] items-stretch"
            >
                <ResizablePanel
                    defaultSize={defaultLayout[0]}
                    collapsedSize={navCollapsedSize}
                    collapsible={true}
                    minSize={15}
                    maxSize={20}
                    onCollapse={() => {
                        setIsCollapsed(true)
                        document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
                            true
                        )}`
                    }}
                    onExpand={() => {
                        setIsCollapsed(false)
                        document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
                            false
                        )}`
                    }}
                    className={isCollapsed ? "min-w-[50px] transition-all duration-300 ease-in-out" : "transition-all duration-300 ease-in-out"}
                >
                    <AppSidebar 
                        isCollapsed={isCollapsed} 
                        currentFolder={folder}
                        unreadCounts={unreadCounts}
                        onFolderChange={onFolderChange}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
                    <MailList 
                        items={mails} 
                        selectedId={selectedMail?.id || null} 
                        loading={loading}
                        folder={folder}
                        onSearch={onSearch}
                        onSelect={(id) => {
                            const mail = mails.find(m => m.id === id)
                            if (mail) {
                                onSelectMail(mail)
                            }
                        }} 
                    />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={defaultLayout[2]}>
                    <MailDisplay 
                        mail={selectedMail} 
                        onMarkAsRead={onMarkAsRead}
                        onMarkAsUnread={onMarkAsUnread}
                        onToggleStar={onToggleStar}
                        onMoveToTrash={onMoveToTrash}
                        onMoveToSpam={onMoveToSpam}
                    />
                </ResizablePanel>
            </ResizablePanelGroup>
        </TooltipProvider>
    )
}
