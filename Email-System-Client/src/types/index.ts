export type User = {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
};

export type Email = {
    id: string;
    thread_id: string;
    user_id: string;
    sender_name: string;
    sender_email: string;
    recipient_emails: string[];
    subject: string;
    snippet: string;
    body_text: string;
    body_html?: string;
    date: string;
    is_read: boolean;
    is_starred: boolean;
    is_draft: boolean;
    labels?: Label[];
    has_attachments?: boolean; // Derived
};

export type Thread = {
    id: string;
    subject: string;
    snippet: string;
    last_message_at: string;
    unread_count?: number; // Derived
    messages?: Email[];
};

export type Label = {
    id: string;
    name: string;
    type: 'system' | 'user';
    color: string;
};
