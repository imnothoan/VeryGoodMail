"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import {
    ChevronDown,
    ChevronUp,
    Download,
    FileIcon,
    Loader2,
    Paperclip,
    Reply,
    Sparkles,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Textarea } from "@/components/ui/textarea"
import { Email } from "@/types"
import { useI18n } from "@/contexts/i18n-context"
import { cn } from "@/lib/utils"

interface ConversationViewProps {
    emails: Email[]
    subject: string
    onReply?: (email: Email) => void
    onSendReply?: (to: string, subject: string, body: string) => Promise<boolean>
}

interface EmailItemProps {
    email: Email
    isExpanded: boolean
    isLatest: boolean
    onToggle: () => void
    onReply?: (email: Email) => void
    language: string
}

function EmailItem({ email, isExpanded, isLatest, onToggle, language }: EmailItemProps) {
    const { t } = useI18n()

    return (
        <div className={cn(
            "border rounded-lg bg-background transition-all",
            isExpanded && "shadow-sm",
            !email.is_read && "border-l-4 border-l-blue-500"
        )}>
            <Collapsible open={isExpanded} onOpenChange={onToggle}>
                {/* Email Header - Always visible */}
                <CollapsibleTrigger asChild>
                    <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={email.sender_avatar_url} alt={email.sender_name} />
                                <AvatarFallback>
                                    {email.sender_name
                                        .split(" ")
                                        .map((chunk) => chunk[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "font-medium",
                                            !email.is_read && "font-bold"
                                        )}>
                                            {email.sender_name}
                                        </span>
                                        {isLatest && (
                                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                {language === 'vi' ? 'Mới nhất' : 'Latest'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(email.date), "PPp", {
                                                locale: language === 'vi' ? vi : enUS
                                            })}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {email.sender_email}
                                </div>
                                {!isExpanded && (
                                    <div className="text-sm text-muted-foreground truncate mt-1">
                                        {email.snippet?.substring(0, 100) || ''}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                </CollapsibleTrigger>

                {/* Email Body - Expandable */}
                <CollapsibleContent>
                    <Separator />
                    <div className="p-4">
                        {/* Recipients info */}
                        <div className="text-xs text-muted-foreground mb-3">
                            <div>
                                <span className="font-medium">{language === 'vi' ? 'Đến' : 'To'}:</span>{' '}
                                {email.recipient_emails?.join(', ')}
                            </div>
                            {email.cc_emails && email.cc_emails.length > 0 && (
                                <div>
                                    <span className="font-medium">CC:</span>{' '}
                                    {email.cc_emails.join(', ')}
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        {email.attachments && email.attachments.length > 0 && (
                            <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Paperclip className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        {t.mail.attachments} ({email.attachments.length})
                                    </span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {email.attachments.map((attachment, index) => (
                                        <a
                                            key={index}
                                            href={attachment.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent transition-colors"
                                        >
                                            <FileIcon className="h-6 w-6 text-muted-foreground" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">
                                                    {attachment.filename}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFileSize(attachment.size_bytes)}
                                                </p>
                                            </div>
                                            <Download className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Email body */}
                        <div className="whitespace-pre-wrap text-sm">
                            {email.body_text}
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    )
}

export function ConversationView({
    emails,
    subject,
    onSendReply,
}: ConversationViewProps) {
    const { t, language } = useI18n()
    const [expandedEmails, setExpandedEmails] = React.useState<Set<string>>(new Set())
    const [replyText, setReplyText] = React.useState("")
    const [isSending, setIsSending] = React.useState(false)
    const scrollEndRef = React.useRef<HTMLDivElement>(null)

    // Auto-expand the latest email
    React.useEffect(() => {
        if (emails.length > 0) {
            const latestEmail = emails[emails.length - 1]
            setExpandedEmails(new Set([latestEmail.id]))
        }
    }, [emails])

    // Scroll to bottom when conversation loads
    React.useEffect(() => {
        scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [emails.length])

    const toggleEmail = (emailId: string) => {
        setExpandedEmails(prev => {
            const newSet = new Set(prev)
            if (newSet.has(emailId)) {
                newSet.delete(emailId)
            } else {
                newSet.add(emailId)
            }
            return newSet
        })
    }

    const handleExpandAll = () => {
        setExpandedEmails(new Set(emails.map(e => e.id)))
    }

    const handleCollapseAll = () => {
        // Keep only the latest expanded
        if (emails.length > 0) {
            setExpandedEmails(new Set([emails[emails.length - 1].id]))
        }
    }

    const handleSendReply = async () => {
        if (!replyText.trim() || emails.length === 0) return
        
        const latestEmail = emails[emails.length - 1]
        setIsSending(true)

        try {
            const success = await onSendReply?.(
                latestEmail.sender_email,
                subject.startsWith('Re:') ? subject : `Re: ${subject}`,
                replyText
            )
            
            if (success) {
                setReplyText("")
            }
        } finally {
            setIsSending(false)
        }
    }

    if (emails.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
                {language === 'vi' ? 'Không có email trong cuộc hội thoại này' : 'No emails in this conversation'}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold line-clamp-2">{subject}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">
                        {emails.length} {language === 'vi' ? 'tin nhắn' : emails.length === 1 ? 'message' : 'messages'}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <Button variant="ghost" size="sm" onClick={handleExpandAll}>
                        {language === 'vi' ? 'Mở tất cả' : 'Expand all'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCollapseAll}>
                        {language === 'vi' ? 'Thu gọn' : 'Collapse'}
                    </Button>
                </div>
            </div>

            {/* Conversation Thread */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {emails.map((email, index) => (
                        <EmailItem
                            key={email.id}
                            email={email}
                            isExpanded={expandedEmails.has(email.id)}
                            isLatest={index === emails.length - 1}
                            onToggle={() => toggleEmail(email.id)}
                            language={language}
                        />
                    ))}
                    <div ref={scrollEndRef} />
                </div>
            </ScrollArea>

            {/* Reply Section */}
            <Separator />
            <div className="p-4 flex-shrink-0 bg-background">
                <form onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}>
                    <div className="grid gap-3">
                        <Textarea
                            className="min-h-[100px] max-h-[200px]"
                            placeholder={`${language === 'vi' ? 'Trả lời cuộc hội thoại' : 'Reply to conversation'}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                            <Button type="button" variant="outline" size="sm">
                                <Sparkles className="mr-2 h-4 w-4" />
                                {t.ai.smartReply}
                            </Button>
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={isSending || !replyText.trim()}
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t.mail.sending}
                                    </>
                                ) : (
                                    <>
                                        <Reply className="mr-2 h-4 w-4" />
                                        {t.mail.send}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

// Helper function for file size formatting
function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
