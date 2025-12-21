"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Paperclip, Send, X, FileIcon, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/contexts/i18n-context"
import { emailService, MAX_FILE_SIZE_MB, UploadedFile } from "@/services/email-service"
import { Attachment } from "@/types"

interface ComposeDialogProps {
    children: React.ReactNode
}

export function ComposeDialog({ children }: ComposeDialogProps) {
    const { t, language } = useI18n()
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)
    const [attachments, setAttachments] = React.useState<UploadedFile[]>([])
    const [uploadError, setUploadError] = React.useState<string | null>(null)
    const [emailSentSuccessfully, setEmailSentSuccessfully] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const formSchema = React.useMemo(() => z.object({
        to: z.string().email({ message: t.auth.invalidEmail }),
        subject: z.string().min(1, { 
            message: language === 'vi' ? 'Tiêu đề là bắt buộc' : 'Subject is required' 
        }),
        body: z.string().min(1, { 
            message: language === 'vi' ? 'Nội dung là bắt buộc' : 'Body is required' 
        }),
    }), [t, language])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            to: "",
            subject: "",
            body: "",
        },
    })

    // Cleanup orphaned files when dialog closes without sending
    const cleanupOrphanedFiles = React.useCallback(async () => {
        // Only cleanup if email was NOT sent successfully
        if (emailSentSuccessfully) return
        
        // Delete uploaded files that weren't sent
        const successfulUploads = attachments.filter(a => a.status === 'done' && a.attachment?.storage_path)
        for (const upload of successfulUploads) {
            if (upload.attachment?.storage_path) {
                await emailService.deleteAttachment(upload.attachment.storage_path)
            }
        }
    }, [attachments, emailSentSuccessfully])

    // Reset form and attachments when dialog closes
    React.useEffect(() => {
        if (!open) {
            // Cleanup any uploaded files that weren't sent
            cleanupOrphanedFiles()
            form.reset()
            setAttachments([])
            setUploadError(null)
            setEmailSentSuccessfully(false)
        }
    }, [open, form, cleanupOrphanedFiles])

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return

        setUploadError(null)
        
        for (const file of Array.from(files)) {
            // Validate file before upload
            const validation = emailService.validateFile(file)
            if (!validation.valid) {
                setUploadError(validation.error || '')
                continue
            }

            // Add to attachments list with pending status
            const uploadedFile: UploadedFile = {
                file,
                progress: 0,
                status: 'uploading',
            }
            
            setAttachments(prev => [...prev, uploadedFile])

            // Upload file
            const result = await emailService.uploadAttachment(file, (progress) => {
                setAttachments(prev => 
                    prev.map(a => 
                        a.file === file ? { ...a, progress } : a
                    )
                )
            })

            if (result.success && result.attachment) {
                setAttachments(prev =>
                    prev.map(a =>
                        a.file === file
                            ? { ...a, status: 'done', attachment: result.attachment }
                            : a
                    )
                )
            } else {
                setAttachments(prev =>
                    prev.map(a =>
                        a.file === file
                            ? { ...a, status: 'error', error: result.error }
                            : a
                    )
                )
                setUploadError(result.error || 'Upload failed')
            }
        }

        // Clear the file input
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleRemoveAttachment = async (uploadedFile: UploadedFile) => {
        // If already uploaded, delete from storage
        if (uploadedFile.attachment?.storage_path) {
            await emailService.deleteAttachment(uploadedFile.attachment.storage_path)
        }
        
        setAttachments(prev => prev.filter(a => a !== uploadedFile))
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Check if any files are still uploading
        if (attachments.some(a => a.status === 'uploading')) {
            setUploadError(language === 'vi' 
                ? 'Vui lòng đợi tải lên hoàn tất' 
                : 'Please wait for uploads to complete')
            return
        }

        setIsLoading(true)
        
        try {
            // Get successfully uploaded attachments
            const validAttachments: Attachment[] = attachments
                .filter(a => a.status === 'done' && a.attachment)
                .map(a => a.attachment!)

            const result = await emailService.sendEmailWithAttachments({
                to: [values.to],
                subject: values.subject,
                body_text: values.body,
                attachments: validAttachments,
            })

            if (result.success) {
                // Mark email as sent so we don't cleanup the attachments
                setEmailSentSuccessfully(true)
                setOpen(false)
                form.reset()
                setAttachments([])
            } else {
                setUploadError(result.error || (language === 'vi' ? 'Gửi thư thất bại' : 'Failed to send email'))
            }
        } catch (error) {
            console.error('Error sending email:', error)
            setUploadError(language === 'vi' ? 'Đã xảy ra lỗi' : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveDraft = async () => {
        const values = form.getValues()
        
        // Check if any files are still uploading
        if (attachments.some(a => a.status === 'uploading')) {
            setUploadError(language === 'vi' 
                ? 'Vui lòng đợi tải lên hoàn tất' 
                : 'Please wait for uploads to complete')
            return
        }

        setIsLoading(true)
        
        try {
            const validAttachments: Attachment[] = attachments
                .filter(a => a.status === 'done' && a.attachment)
                .map(a => a.attachment!)

            await emailService.sendEmailWithAttachments({
                to: values.to ? [values.to] : [],
                subject: values.subject || '',
                body_text: values.body || '',
                is_draft: true,
                attachments: validAttachments,
            })
            // Mark as sent to prevent cleanup (drafts also use the attachments)
            setEmailSentSuccessfully(true)
            setOpen(false)
            form.reset()
            setAttachments([])
        } catch (error) {
            console.error('Error saving draft:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Calculate total size of attachments
    const totalSize = attachments.reduce((sum, a) => sum + a.file.size, 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t.mail.newMessage}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="to"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="grid grid-cols-[60px_1fr] items-center gap-4">
                                        <FormLabel className="text-right text-muted-foreground">
                                            {t.mail.to}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="recipient@example.com"
                                                className="border-0 shadow-none focus-visible:ring-0"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                        </FormControl>
                                    </div>
                                    <Separator />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="grid grid-cols-[60px_1fr] items-center gap-4">
                                        <FormLabel className="text-right text-muted-foreground">
                                            {t.mail.subject}
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={t.mail.subject}
                                                className="border-0 shadow-none focus-visible:ring-0"
                                                disabled={isLoading}
                                                {...field}
                                            />
                                        </FormControl>
                                    </div>
                                    <Separator />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="body"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t.mail.typeMessage}
                                            className="min-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0"
                                            disabled={isLoading}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Attachments section */}
                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{t.mail.attachments} ({attachments.length})</span>
                                    <span>{emailService.formatFileSize(totalSize)}</span>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {attachments.map((attachment, index) => (
                                        <div 
                                            key={index}
                                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                                        >
                                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm truncate">{attachment.file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {emailService.formatFileSize(attachment.file.size)}
                                                    {attachment.status === 'uploading' && ` - ${attachment.progress}%`}
                                                    {attachment.status === 'error' && (
                                                        <span className="text-destructive ml-2">
                                                            {language === 'vi' ? 'Lỗi' : 'Error'}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            {attachment.status === 'uploading' ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => handleRemoveAttachment(attachment)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error message */}
                        {uploadError && (
                            <div className="flex items-center gap-2 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4" />
                                <span>{uploadError}</span>
                            </div>
                        )}

                        <DialogFooter className="flex items-center justify-between sm:justify-between">
                            <div className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileSelect}
                                    disabled={isLoading}
                                />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    disabled={isLoading}
                                    onClick={() => fileInputRef.current?.click()}
                                    title={`${t.mail.attachments} (${language === 'vi' ? 'Tối đa' : 'Max'} ${MAX_FILE_SIZE_MB}MB)`}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleSaveDraft}
                                    disabled={isLoading}
                                >
                                    {language === 'vi' ? 'Lưu nháp' : 'Save Draft'}
                                </Button>
                            </div>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Send className="mr-2 h-4 w-4" />
                                {t.mail.send}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
