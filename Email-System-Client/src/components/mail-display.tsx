"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import {
    Archive,
    ArchiveX,
    Clock,
    Download,
    FileIcon,
    Forward,
    Loader2,
    MessageSquare,
    MoreVertical,
    Paperclip,
    Reply,
    ReplyAll,
    Sparkles,
    Star,
    Trash2,
} from "lucide-react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip"
import { Textarea } from "@/components/ui/textarea"
import { Email } from "@/types"
import { useI18n } from "@/contexts/i18n-context"
import { aiService } from "@/services/ai-service"
import { emailService } from "@/services/email-service"
import { ConversationView } from "@/components/conversation-view"

interface MailDisplayProps {
    mail: Email | null
    onMarkAsRead?: (id: string) => Promise<void>
    onMarkAsUnread?: (id: string) => Promise<void>
    onToggleStar?: (id: string) => Promise<void>
    onMoveToTrash?: (id: string) => Promise<void>
    onMoveToSpam?: (id: string) => Promise<void>
}

export function MailDisplay({ 
    mail,
    onMarkAsRead: _onMarkAsRead,
    onMarkAsUnread,
    onToggleStar,
    onMoveToTrash,
    onMoveToSpam,
}: MailDisplayProps) {
    const { t, language } = useI18n()
    const [replyText, setReplyText] = React.useState("")
    const [isSending, setIsSending] = React.useState(false)
    
    // Conversation/Thread state
    const [threadEmails, setThreadEmails] = React.useState<Email[]>([])
    const [isLoadingThread, setIsLoadingThread] = React.useState(false)
    const [showConversation, setShowConversation] = React.useState(false)
    
    // AI Assistant state
    const [aiSummary, setAiSummary] = React.useState<string | null>(null)
    const [smartReplies, setSmartReplies] = React.useState<string[]>([])
    const [isLoadingAI, setIsLoadingAI] = React.useState(false)
    const [showAIPanel, setShowAIPanel] = React.useState(false)

    // Reset state when mail changes
    React.useEffect(() => {
        setAiSummary(null)
        setSmartReplies([])
        setShowAIPanel(false)
        setThreadEmails([])
        setShowConversation(false)
    }, [mail?.id])

    // Fetch thread emails when mail changes
    React.useEffect(() => {
        const fetchThread = async () => {
            if (!mail?.thread_id) return
            
            setIsLoadingThread(true)
            try {
                const result = await emailService.getThreadEmails(mail.thread_id)
                if (result && result.emails.length > 1) {
                    setThreadEmails(result.emails)
                    // Don't auto-show conversation - let user click the button
                    // This prevents disrupting the user's workflow
                } else {
                    setThreadEmails([])
                    setShowConversation(false)
                }
            } catch (error) {
                console.error('Error fetching thread:', error)
                setThreadEmails([])
            } finally {
                setIsLoadingThread(false)
            }
        }
        
        fetchThread()
    }, [mail?.thread_id])

    const handleSummarize = async () => {
        if (!mail) return
        setIsLoadingAI(true)
        setShowAIPanel(true)
        
        try {
            const result = await aiService.summarizeEmail(
                mail.subject,
                mail.body_text,
                language === 'vi' ? 'vi' : 'en'
            )
            setAiSummary(result.summary)
        } catch (error) {
            console.error('Error summarizing:', error)
            setAiSummary(language === 'vi' 
                ? 'Không thể tạo tóm tắt. Vui lòng thử lại.'
                : 'Unable to generate summary. Please try again.')
        } finally {
            setIsLoadingAI(false)
        }
    }

    const handleGetSmartReplies = async () => {
        if (!mail) return
        setIsLoadingAI(true)
        setShowAIPanel(true)
        
        try {
            const result = await aiService.generateSmartReplies(
                mail.body_text,
                language === 'vi' ? 'vi' : 'en'
            )
            setSmartReplies(result.replies || [])
        } catch (error) {
            console.error('Error generating smart replies:', error)
            setSmartReplies([])
        } finally {
            setIsLoadingAI(false)
        }
    }

    const handleSmartReplySelect = (reply: string) => {
        setReplyText(reply)
    }

    const handleSendReply = async () => {
        if (!replyText.trim() || !mail) return
        setIsSending(true)
        
        try {
            // Validate sender_email exists
            if (!mail.sender_email || !mail.sender_email.includes('@')) {
                console.error('Invalid sender email address')
                return
            }
            
            const result = await emailService.sendEmail({
                to: [mail.sender_email],
                subject: mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`,
                body_text: replyText,
            })

            if (result.success) {
                setReplyText("")
                // Show success feedback - could add toast notification here
                console.log('Reply sent successfully')
            } else {
                // Handle specific error cases
                const errorMsg = result.error || 'Failed to send reply'
                console.error('Failed to send reply:', errorMsg)
                // Could show user-friendly toast notification here
            }
        } catch (error) {
            console.error('Error sending reply:', error)
        } finally {
            setIsSending(false)
        }
    }

    // Handle reply from conversation view
    const handleConversationReply = async (to: string, subject: string, body: string): Promise<boolean> => {
        try {
            const result = await emailService.sendEmail({
                to: [to],
                subject,
                body_text: body,
            })
            return result.success
        } catch (error) {
            console.error('Error sending reply:', error)
            return false
        }
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center p-2">
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Archive className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.archive}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.archive}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    disabled={!mail}
                                    onClick={() => mail && onMoveToSpam?.(mail.id)}
                                >
                                    <ArchiveX className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.moveToSpam}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.moveToSpam}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    disabled={!mail}
                                    onClick={() => mail && onMoveToTrash?.(mail.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.moveToTrash}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.moveToTrash}</TooltipContent>
                        </Tooltip>
                        <Separator orientation="vertical" className="mx-1 h-6" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    disabled={!mail}
                                    onClick={() => mail && onToggleStar?.(mail.id)}
                                >
                                    <Star className={`h-4 w-4 ${mail?.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                    <span className="sr-only">{t.mail.starThread}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.starThread}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Clock className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.snooze}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.snooze}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {/* Conversation View Toggle */}
                    {threadEmails.length > 1 && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant={showConversation ? "secondary" : "ghost"} 
                                        size="icon" 
                                        disabled={!mail || isLoadingThread}
                                        onClick={() => setShowConversation(!showConversation)}
                                    >
                                        {isLoadingThread ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <MessageSquare className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                            {language === 'vi' ? 'Xem cuộc hội thoại' : 'View Conversation'}
                                        </span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {language === 'vi' 
                                        ? `Cuộc hội thoại (${threadEmails.length} tin nhắn)` 
                                        : `Conversation (${threadEmails.length} messages)`}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    {/* AI Assistant button */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={showAIPanel ? "secondary" : "ghost"} 
                                    size="icon" 
                                    disabled={!mail || isLoadingAI}
                                    onClick={handleSummarize}
                                >
                                    {isLoadingAI ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">AI Assistant</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {language === 'vi' ? 'Trợ lý AI (Gemini)' : 'AI Assistant (Gemini)'}
                            </TooltipContent>
                        </Tooltip>
                        <Separator orientation="vertical" className="mx-1 h-6" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Reply className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.reply}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.reply}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <ReplyAll className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.replyAll}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.replyAll}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Forward className="h-4 w-4" />
                                    <span className="sr-only">{t.mail.forward}</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t.mail.forward}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <Separator orientation="vertical" className="mx-1 h-6" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!mail}>
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">More</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => mail && onMarkAsUnread?.(mail.id)}>
                                {t.mail.markAsUnread}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => mail && onToggleStar?.(mail.id)}>
                                {t.mail.starThread}
                            </DropdownMenuItem>
                            <DropdownMenuItem>{t.mail.addLabel}</DropdownMenuItem>
                            <DropdownMenuItem>{t.mail.muteThread}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Separator />
            {mail ? (
                /* Show Conversation View if enabled and has multiple emails */
                showConversation && threadEmails.length > 1 ? (
                    <ConversationView
                        emails={threadEmails}
                        subject={mail.subject}
                        onSendReply={handleConversationReply}
                    />
                ) : (
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* AI Panel */}
                    {showAIPanel && (
                        <>
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 border-b flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium text-sm">
                                        {language === 'vi' ? 'Trợ lý AI Gemini' : 'Gemini AI Assistant'}
                                    </span>
                                </div>
                                
                                {isLoadingAI ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t.ai.summarizing}
                                    </div>
                                ) : (
                                    <>
                                        {aiSummary && (
                                            <div className="mb-3">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">{t.ai.summary}:</p>
                                                <p className="text-sm">{aiSummary}</p>
                                            </div>
                                        )}
                                        
                                        {smartReplies.length > 0 && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-2">{t.ai.smartReply}:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {smartReplies.map((reply, index) => (
                                                        <Button
                                                            key={index}
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs"
                                                            onClick={() => handleSmartReplySelect(reply)}
                                                        >
                                                            {reply.length > 50 ? `${reply.substring(0, 50)}...` : reply}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!aiSummary && smartReplies.length === 0 && (
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={handleSummarize}
                                                >
                                                    {t.ai.summarize}
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={handleGetSmartReplies}
                                                >
                                                    {t.ai.smartReply}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}
                    
                    {/* Scrollable content area */}
                    <ScrollArea className="flex-1">
                        {/* Email header */}
                        <div className="flex items-start p-4 flex-shrink-0">
                            <div className="flex items-start gap-4 text-sm">
                                <Avatar>
                                    <AvatarImage src={mail.sender_avatar_url} alt={mail.sender_name} />
                                    <AvatarFallback>
                                        {mail.sender_name
                                            .split(" ")
                                            .map((chunk) => chunk[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid gap-1">
                                    <div className="font-semibold">{mail.sender_name}</div>
                                    <div className="line-clamp-1 text-xs">{mail.subject}</div>
                                    <div className="line-clamp-1 text-xs">
                                        <span className="font-medium">{t.mail.replyTo}:</span> {mail.sender_email}
                                    </div>
                                </div>
                            </div>
                            {mail.date && (
                                <div className="ml-auto text-xs text-muted-foreground">
                                    {format(new Date(mail.date), "PPpp", {
                                        locale: language === 'vi' ? vi : enUS
                                    })}
                                </div>
                            )}
                        </div>
                        <Separator />
                        
                        {/* Attachments Section */}
                        {mail.attachments && mail.attachments.length > 0 && (
                            <>
                                <div className="p-4 bg-muted/30 flex-shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Paperclip className="h-4 w-4" />
                                    <span className="text-sm font-medium">
                                        {t.mail.attachments} ({mail.attachments.length})
                                    </span>
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {mail.attachments.map((attachment, index) => (
                                        <a
                                            key={index}
                                            href={attachment.url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent transition-colors"
                                        >
                                            <FileIcon className="h-8 w-8 text-muted-foreground" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
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
                            <Separator />
                        </>
                    )}
                    
                        {/* Email body content - scrollable */}
                        <div className="whitespace-pre-wrap p-4 text-sm">
                            {mail.body_text}
                        </div>
                    </ScrollArea>
                    
                    {/* Reply section - fixed at bottom */}
                    <Separator />
                    <div className="p-4 flex-shrink-0 bg-background">
                        <form onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}>
                            <div className="grid gap-4">
                                <Textarea
                                    className="p-4 min-h-[100px] max-h-[200px]"
                                    placeholder={`${t.mail.replyTo} ${mail.sender_name}...`}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <div className="flex items-center justify-between">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={handleGetSmartReplies}
                                        disabled={isLoadingAI}
                                    >
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
                                            t.mail.send
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
                )
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    {t.mail.noMessageSelected}
                </div>
            )}
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
