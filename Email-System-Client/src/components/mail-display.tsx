import { format } from "date-fns"
import {
    Archive,
    ArchiveX,
    Clock,
    Forward,
    MoreVertical,
    Reply,
    ReplyAll,
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

interface MailDisplayProps {
    mail: Email | null
}

export function MailDisplay({ mail }: MailDisplayProps) {
    const today = new Date()

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center p-2">
                <div className="flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Archive className="h-4 w-4" />
                                    <span className="sr-only">Archive</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Archive</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <ArchiveX className="h-4 w-4" />
                                    <span className="sr-only">Move to junk</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move to junk</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Move to trash</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move to trash</TooltipContent>
                        </Tooltip>
                        <Separator orientation="vertical" className="mx-1 h-6" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Clock className="h-4 w-4" />
                                    <span className="sr-only">Snooze</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Snooze</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Reply className="h-4 w-4" />
                                    <span className="sr-only">Reply</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reply</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <ReplyAll className="h-4 w-4" />
                                    <span className="sr-only">Reply all</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reply all</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={!mail}>
                                    <Forward className="h-4 w-4" />
                                    <span className="sr-only">Forward</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Forward</TooltipContent>
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
                            <DropdownMenuItem>Mark as unread</DropdownMenuItem>
                            <DropdownMenuItem>Star thread</DropdownMenuItem>
                            <DropdownMenuItem>Add label</DropdownMenuItem>
                            <DropdownMenuItem>Mute thread</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <Separator />
            {mail ? (
                <div className="flex flex-1 flex-col">
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
                                    <span className="font-medium">Reply-To:</span> {mail.sender_email}
                                </div>
                            </div>
                        </div>
                        {mail.date && (
                            <div className="ml-auto text-xs text-muted-foreground">
                                {format(new Date(mail.date), "PPpp")}
                            </div>
                        )}
                    </div>
                    <Separator />
                    <div className="flex-1 whitespace-pre-wrap p-4 text-sm">
                        {mail.body_text}
                    </div>
                    <Separator className="mt-auto" />
                    <div className="p-4">
                        <form>
                            <div className="grid gap-4">
                                <Textarea
                                    className="p-4"
                                    placeholder={`Reply to ${mail.sender_name}...`}
                                />
                                <div className="flex items-center">
                                    <Button size="sm" className="ml-auto">
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-muted-foreground">
                    No message selected
                </div>
            )}
        </div>
    )
}
