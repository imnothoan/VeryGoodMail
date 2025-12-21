import { ComponentProps } from "react"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Email } from "@/types"

interface MailListProps {
    items: Email[]
    selectedId?: string | null
    onSelect?: (id: string) => void
}

export function MailList({ items, selectedId, onSelect }: MailListProps) {
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
                                    <div className="font-semibold">{item.sender_name}</div>
                                    {!item.is_read && (
                                        <span className="flex h-2 w-2 rounded-full bg-blue-600" />
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
                                    })}
                                </div>
                            </div>
                            <div className="text-xs font-medium">{item.subject}</div>
                        </div>
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                            {item.snippet.substring(0, 300)}
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
