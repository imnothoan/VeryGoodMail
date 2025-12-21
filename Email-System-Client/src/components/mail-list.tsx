"use client"

import { ComponentProps } from "react"
import { formatDistanceToNow } from "date-fns"
import { vi, enUS } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Email } from "@/types"
import { useI18n } from "@/contexts/i18n-context"
import { Skeleton } from "@/components/ui/skeleton"

interface MailListProps {
    items: Email[]
    selectedId?: string | null
    loading?: boolean
    onSelect?: (id: string) => void
}

export function MailList({ items, selectedId, loading = false, onSelect }: MailListProps) {
    const { t, language } = useI18n()

    // Show skeleton loading state
    if (loading && items.length === 0) {
        return (
            <ScrollArea className="h-screen">
                <div className="flex flex-col gap-2 p-4 pt-0">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
                            <div className="flex w-full flex-col gap-1">
                                <div className="flex items-center">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="ml-auto h-3 w-16" />
                                </div>
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-8 w-full" />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    // Show empty state
    if (!loading && items.length === 0) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                    <p className="text-lg font-medium text-muted-foreground">
                        {t.common.noResults}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {language === 'vi' 
                            ? 'Không có email nào trong thư mục này'
                            : 'No emails in this folder'}
                    </p>
                </div>
            </div>
        )
    }

    return (
        <ScrollArea className="h-screen">
            <div className="flex flex-col gap-2 p-4 pt-0">
                {items.map((item) => (
                    <button
                        key={item.id}
                        className={cn(
                            "flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all hover:bg-accent",
                            selectedId === item.id && "bg-muted"
                        )}
                        onClick={() => onSelect?.(item.id)}
                    >
                        <div className="flex w-full flex-col gap-1">
                            <div className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "font-semibold",
                                        !item.is_read && "font-bold"
                                    )}>
                                        {item.sender_name}
                                    </div>
                                    {!item.is_read && (
                                        <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                                    )}
                                    {item.is_starred && (
                                        <span className="text-yellow-500">★</span>
                                    )}
                                </div>
                                <div
                                    className={cn(
                                        "ml-auto text-xs",
                                        selectedId === item.id
                                            ? "text-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {formatDistanceToNow(new Date(item.date), {
                                        addSuffix: true,
                                        locale: language === 'vi' ? vi : enUS,
                                    })}
                                </div>
                            </div>
                            <div className={cn(
                                "text-xs",
                                !item.is_read ? "font-semibold" : "font-medium"
                            )}>
                                {item.subject}
                            </div>
                        </div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                            {item.snippet?.substring(0, 300) || ''}
                        </div>
                        {item.labels && item.labels.length > 0 ? (
                            <div className="flex items-center gap-2">
                                {item.labels.map((label) => (
                                    <Badge key={label.id} variant={getBadgeVariantFromLabel(label.name)}>
                                        {label.name}
                                    </Badge>
                                ))}
                            </div>
                        ) : null}
                    </button>
                ))}
            </div>
        </ScrollArea>
    )
}

function getBadgeVariantFromLabel(label: string): ComponentProps<typeof Badge>["variant"] {
    if (["work"].includes(label.toLowerCase())) {
        return "default"
    }

    if (["personal"].includes(label.toLowerCase())) {
        return "outline"
    }

    return "secondary"
}
