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
    cc_emails?: string[];
    bcc_emails?: string[];
    subject: string;
    snippet: string;
    body_text: string;
    body_html?: string;
    date: string;
    is_read: boolean;
    is_starred: boolean;
    is_draft: boolean;
    is_sent?: boolean;
    is_spam?: boolean;
    is_trashed?: boolean;
    ai_category?: 'important' | 'social' | 'promotions' | 'updates' | 'primary' | 'spam';
    ai_sentiment?: 'positive' | 'negative' | 'neutral';
    ai_spam_score?: number;
    labels?: Label[];
    attachments?: Attachment[];
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

export type Attachment = {
    id: string;
    email_id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    storage_path: string;
    url?: string;
    created_at?: string;
};
