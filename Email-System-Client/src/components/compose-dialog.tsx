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

const formSchema = z.object({
    to: z.string().email({ message: "Invalid email address" }),
    subject: z.string().min(1, { message: "Subject is required" }),
    body: z.string().min(1, { message: "Body is required" }),
})

interface ComposeDialogProps {
    children: React.ReactNode
}

export function ComposeDialog({ children }: ComposeDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

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
        // Mock API call
        await new Promise((resolve) => setTimeout(resolve, 1000))
        console.log(values)
        setIsLoading(false)
        setOpen(false)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
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
                                            To
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="recipient@example.com"
                                                className="border-0 shadow-none focus-visible:ring-0"
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
                                            Subject
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Subject"
                                                className="border-0 shadow-none focus-visible:ring-0"
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
                                            placeholder="Type your message here..."
                                            className="min-h-[300px] resize-none border-0 shadow-none focus-visible:ring-0"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="flex items-center justify-between sm:justify-between">
                            <Button type="button" variant="ghost" size="icon">
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
