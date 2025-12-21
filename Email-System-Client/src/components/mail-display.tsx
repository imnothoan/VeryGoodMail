"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi, enUS } from "date-fns/locale"
import {
    Archive,
    ArchiveX,
    Clock,
    Forward,
    Loader2,
    MoreVertical,
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
    onMarkAsRead,
    onMarkAsUnread,
    onToggleStar,
    onMoveToTrash,
    onMoveToSpam,
}: MailDisplayProps) {
    const { t, language } = useI18n()
    const [replyText, setReplyText] = React.useState("")
    const [isSending, setIsSending] = React.useState(false)
    
    // AI Assistant state
    const [aiSummary, setAiSummary] = React.useState<string | null>(null)
    const [smartReplies, setSmartReplies] = React.useState<string[]>([])
    const [isLoadingAI, setIsLoadingAI] = React.useState(false)
    const [showAIPanel, setShowAIPanel] = React.useState(false)

    // Reset AI state when mail changes
    React.useEffect(() => {
        setAiSummary(null)
        setSmartReplies([])
        setShowAIPanel(false)
    }, [mail?.id])

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
            // Import emailService dynamically to avoid circular dependencies
            const { emailService } = await import("@/services/email-service")
            
            const result = await emailService.sendEmail({
                to: [mail.sender_email],
                subject: mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`,
                body_text: replyText,
            })

            if (result.success) {
                setReplyText("")
                // Show success feedback
                console.log('Reply sent successfully')
            } else {
                console.error('Failed to send reply:', result.error)
            }
        } catch (error) {
            console.error('Error sending reply:', error)
        } finally {
            setIsSending(false)
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
                <div className="flex flex-1 flex-col">
                    {/* AI Panel */}
                    {showAIPanel && (
                        <>
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 border-b">
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
                    
                    <div className="flex items-start p-4">
                        <div className="flex items-start gap-4 text-sm">
                            <Avatar>
                                <AvatarImage alt={mail.sender_name} />
                                <AvatarFallback>
                                    {mail.sender_name
                                        .split(" ")
                                        .map((chunk) => chunk[0])
                                        .join("")}
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
                    <div className="flex-1 whitespace-pre-wrap p-4 text-sm overflow-auto">
                        {mail.body_text}
                    </div>
                    <Separator className="mt-auto" />
                    <div className="p-4">
                        <form onSubmit={(e) => { e.preventDefault(); handleSendReply(); }}>
                            <div className="grid gap-4">
                                <Textarea
                                    className="p-4"
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
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    {t.mail.noMessageSelected}
                </div>
            )}
        </div>
    )
}
