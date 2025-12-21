"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Paperclip, Send } from "lucide-react"

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
import { emailService } from "@/services/email-service"
import { useToast } from "@/hooks/use-toast"

interface ComposeDialogProps {
    children: React.ReactNode
}

export function ComposeDialog({ children }: ComposeDialogProps) {
    const { t, language } = useI18n()
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

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

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        
        try {
            const result = await emailService.sendEmail({
                to: [values.to],
                subject: values.subject,
                body_text: values.body,
            })

            if (result.success) {
                setOpen(false)
                form.reset()
            } else {
                // Show error
                console.error('Failed to send email:', result.error)
            }
        } catch (error) {
            console.error('Error sending email:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveDraft = async () => {
        const values = form.getValues()
        setIsLoading(true)
        
        try {
            await emailService.sendEmail({
                to: values.to ? [values.to] : [],
                subject: values.subject || '',
                body_text: values.body || '',
                is_draft: true,
            })
            setOpen(false)
            form.reset()
        } catch (error) {
            console.error('Error saving draft:', error)
        } finally {
            setIsLoading(false)
        }
    }

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
                                            className="min-h-[300px] resize-none border-0 shadow-none focus-visible:ring-0"
                                            disabled={isLoading}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="flex items-center justify-between sm:justify-between">
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" size="icon" disabled={isLoading}>
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
