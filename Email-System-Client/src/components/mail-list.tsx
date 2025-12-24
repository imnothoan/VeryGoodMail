"use client"

import { ComponentProps, useState, useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import { Paperclip, Search, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Email } from "@/types"
import { useI18n } from "@/contexts/i18n-context"
import { Skeleton } from "@/components/ui/skeleton"
import { Folder } from "@/services/email-service"

interface MailListProps {
    items: Email[]
    selectedId?: string | null
    loading?: boolean
    folder?: Folder
    onSelect?: (id: string) => void
    onSearch?: (query: string) => void
}

// Map folder to display name
const getFolderDisplayName = (folder: Folder, language: string): string => {
    const folderNames: Record<Folder, { vi: string; en: string }> = {
        inbox: { vi: 'Hộp thư đến', en: 'Inbox' },
        sent: { vi: 'Đã gửi', en: 'Sent' },
        drafts: { vi: 'Bản nháp', en: 'Drafts' },
        spam: { vi: 'Thư rác', en: 'Spam' },
        trash: { vi: 'Thùng rác', en: 'Trash' },
        starred: { vi: 'Được gắn sao', en: 'Starred' },
        important: { vi: 'Quan trọng', en: 'Important' },
        social: { vi: 'Xã hội', en: 'Social' },
        updates: { vi: 'Cập nhật', en: 'Updates' },
        promotions: { vi: 'Khuyến mãi', en: 'Promotions' },
        archive: { vi: 'Lưu trữ', en: 'Archive' },
        primary: { vi: 'Chính', en: 'Primary' },
    }
    return folderNames[folder]?.[language === 'vi' ? 'vi' : 'en'] || folder
}

export function MailList({ items, selectedId, loading = false, folder = 'inbox', onSelect, onSearch }: MailListProps) {
    const { t, language } = useI18n()
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchFocused, setIsSearchFocused] = useState(false)

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)
    }, [])

    const handleSearchSubmit = useCallback(() => {
        if (onSearch) {
            onSearch(searchQuery)
        }
    }, [searchQuery, onSearch])

    const handleClearSearch = useCallback(() => {
        setSearchQuery('')
        if (onSearch) {
            onSearch('')
        }
    }, [onSearch])

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearchSubmit()
        } else if (e.key === 'Escape') {
            handleClearSearch()
        }
    }, [handleSearchSubmit, handleClearSearch])

    // Show skeleton loading state
    if (loading && items.length === 0) {
        return (
            <div className="flex flex-col h-full">
                {/* Search Header */}
                <div className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{getFolderDisplayName(folder, language)}</h2>
                    </div>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.common.search + '...'}
                            className="pl-9 pr-9"
                            disabled
                        />
                    </div>
                </div>
                <Separator />
                <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-2 p-4 pt-2">
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
            </div>
        )
    }

    // Show empty state
    if (!loading && items.length === 0) {
        return (
            <div className="flex flex-col h-full">
                {/* Search Header */}
                <div className="p-4 pb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">{getFolderDisplayName(folder, language)}</h2>
                    </div>
                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t.common.search + '...'}
                            className="pl-9 pr-9"
                            value={searchQuery ?? ''}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        {searchQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={handleClearSearch}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
                <Separator />
                <div className="flex flex-1 items-center justify-center p-8">
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
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="p-4 pb-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{getFolderDisplayName(folder, language)}</h2>
                    <span className="text-sm text-muted-foreground">({items.length})</span>
                </div>
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t.common.search + '...'}
                        className={cn(
                            "pl-9 pr-9 transition-all",
                            isSearchFocused && "ring-2 ring-ring"
                        )}
                        value={searchQuery ?? ''}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={handleClearSearch}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
            <Separator />
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-2 p-4 pt-2">
                    {items.map((item) => {
                        // For sent/drafts folder, show recipient instead of sender
                        const isSentOrDraft = folder === 'sent' || folder === 'drafts';
                        const displayName = isSentOrDraft 
                            ? (item.recipient_emails?.[0] || (language === 'vi' ? '(Không có người nhận)' : '(No recipient)'))
                            : item.sender_name;
                        const displayPrefix = isSentOrDraft 
                            ? (language === 'vi' ? 'Đến: ' : 'To: ')
                            : '';
                            
                        return (
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
                                                "font-semibold truncate max-w-[200px]",
                                                !item.is_read && "font-bold"
                                            )}>
                                                {displayPrefix}{displayName}
                                            </div>
                                            {!item.is_read && (
                                                <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                                            )}
                                            {item.is_starred && (
                                                <span className="text-yellow-500">★</span>
                                            )}
                                            {(item.has_attachments || (item.attachments && item.attachments.length > 0)) && (
                                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div
                                            className={cn(
                                                "ml-auto text-xs flex-shrink-0",
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
                            <div className="flex items-center gap-2">
                                {item.ai_category && item.ai_category !== 'primary' && (
                                    <Badge variant="secondary" className="text-xs">
                                        {item.ai_category}
                                    </Badge>
                                )}
                                {item.labels && item.labels.length > 0 && item.labels.map((label) => (
                                    <Badge key={label.id} variant={getBadgeVariantFromLabel(label.name)}>
                                        {label.name}
                                    </Badge>
                                ))}
                            </div>
                        </button>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
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
