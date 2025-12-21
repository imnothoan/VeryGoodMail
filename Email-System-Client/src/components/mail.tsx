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

interface MailProps {
    mails: Email[]
    defaultLayout?: number[] | undefined
    defaultCollapsed?: boolean
    navCollapsedSize?: number
}

export function Mail({
    mails,
    defaultLayout = [20, 32, 48],
    defaultCollapsed = false,
    navCollapsedSize = 4,
}: MailProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
    const [selectedMailId, setSelectedMailId] = React.useState<string | null>(null)

    const selectedMail = mails.find((mail) => mail.id === selectedMailId) || null

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "j" || e.key === "k") {
                e.preventDefault()
                const currentIndex = mails.findIndex((mail) => mail.id === selectedMailId)
                let newIndex = currentIndex

                if (e.key === "j") {
                    newIndex = Math.min(currentIndex + 1, mails.length - 1)
                } else if (e.key === "k") {
                    newIndex = Math.max(currentIndex - 1, 0)
                }

                if (newIndex !== currentIndex && newIndex >= 0) {
                    setSelectedMailId(mails[newIndex].id)
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [mails, selectedMailId])

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
                    <AppSidebar isCollapsed={isCollapsed} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
                    <MailList items={mails} selectedId={selectedMailId} onSelect={setSelectedMailId} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={defaultLayout[2]}>
                    <MailDisplay mail={selectedMail} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </TooltipProvider>
    )
}
