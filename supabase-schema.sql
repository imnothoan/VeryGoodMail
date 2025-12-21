-- ============================================================
-- VeryGoodMail Database Schema for Supabase
-- © 2025 VeryGoodMail by Hoàn
-- ============================================================
-- 
-- HƯỚNG DẪN SỬ DỤNG:
-- 1. Mở Supabase Dashboard > SQL Editor
-- 2. Copy toàn bộ nội dung file này
-- 3. Chạy SQL
--
-- LƯU Ý QUAN TRỌNG:
-- - Nội dung email (body_text, body_html) được mã hóa AES-256 trước khi lưu
-- - Admin không thể đọc được nội dung email trong database
-- - Chỉ có user với encryption key mới giải mã được
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'vi' CHECK (language IN ('vi', 'en')),
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    signature TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. LABELS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.labels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'user' CHECK (type IN ('system', 'user')),
    color TEXT DEFAULT '#808080',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- Policies for labels
CREATE POLICY "Users can view own labels" ON public.labels
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own labels" ON public.labels
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own labels" ON public.labels
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own labels" ON public.labels
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. THREADS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.threads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    snippet TEXT, -- First 100 chars of last message (encrypted)
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    trashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

-- Policies for threads
CREATE POLICY "Users can view own threads" ON public.threads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own threads" ON public.threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON public.threads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own threads" ON public.threads
    FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_threads_user_id ON public.threads(user_id);
CREATE INDEX idx_threads_last_message_at ON public.threads(last_message_at DESC);

-- ============================================================
-- 4. EMAILS TABLE
-- ============================================================
-- NOTE: body_text and body_html are ENCRYPTED with AES-256
-- The encryption is handled at application level
-- Admin CANNOT read email content
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Sender info
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    
    -- Recipients (stored as JSONB array)
    recipient_emails JSONB DEFAULT '[]'::JSONB,
    cc_emails JSONB DEFAULT '[]'::JSONB,
    bcc_emails JSONB DEFAULT '[]'::JSONB,
    
    -- Email content
    subject TEXT NOT NULL,
    snippet TEXT, -- Preview text (encrypted)
    body_text TEXT, -- Plain text body (ENCRYPTED with AES-256)
    body_html TEXT, -- HTML body (ENCRYPTED with AES-256)
    
    -- AI Analysis results (stored separately, not encrypted)
    ai_summary TEXT, -- AI-generated summary
    ai_category TEXT CHECK (ai_category IN ('important', 'social', 'promotions', 'updates', 'primary', 'spam')),
    ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'negative', 'neutral')),
    ai_spam_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Status flags
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_draft BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    is_spam BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    date TIMESTAMPTZ DEFAULT NOW(),
    trashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Policies for emails
CREATE POLICY "Users can view own emails" ON public.emails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own emails" ON public.emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails" ON public.emails
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails" ON public.emails
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_emails_user_id ON public.emails(user_id);
CREATE INDEX idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX idx_emails_date ON public.emails(date DESC);
CREATE INDEX idx_emails_is_read ON public.emails(user_id, is_read);
CREATE INDEX idx_emails_is_starred ON public.emails(user_id, is_starred);
CREATE INDEX idx_emails_is_spam ON public.emails(user_id, is_spam);
CREATE INDEX idx_emails_is_draft ON public.emails(user_id, is_draft);
CREATE INDEX idx_emails_ai_category ON public.emails(user_id, ai_category);

-- Full-text search index (on subject only, content is encrypted)
CREATE INDEX idx_emails_subject_search ON public.emails 
    USING GIN (to_tsvector('english', subject));

-- ============================================================
-- 5. EMAIL_LABELS (Junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_labels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE NOT NULL,
    label_id UUID REFERENCES public.labels(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email_id, label_id)
);

-- Enable RLS
ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;

-- Policies for email_labels
CREATE POLICY "Users can view own email labels" ON public.email_labels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.emails 
            WHERE emails.id = email_labels.email_id 
            AND emails.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own email labels" ON public.email_labels
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.emails 
            WHERE emails.id = email_labels.email_id 
            AND emails.user_id = auth.uid()
        )
    );

-- Index for performance
CREATE INDEX idx_email_labels_email_id ON public.email_labels(email_id);
CREATE INDEX idx_email_labels_label_id ON public.email_labels(label_id);

-- ============================================================
-- 6. ATTACHMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Policies for attachments
CREATE POLICY "Users can view own attachments" ON public.attachments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attachments" ON public.attachments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments" ON public.attachments
    FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_attachments_email_id ON public.attachments(email_id);

-- ============================================================
-- 7. CONTACTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    frequency INTEGER DEFAULT 0, -- How often user emails this contact
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email)
);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Policies for contacts
CREATE POLICY "Users can view own contacts" ON public.contacts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own contacts" ON public.contacts
    FOR ALL USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX idx_contacts_frequency ON public.contacts(user_id, frequency DESC);

-- ============================================================
-- 8. AI TRAINING DATA (for PhoBERT fine-tuning)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_training_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    text_content TEXT NOT NULL,
    label_type TEXT NOT NULL CHECK (label_type IN ('spam', 'sentiment', 'category')),
    label_value TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_training_data ENABLE ROW LEVEL SECURITY;

-- Only admins can view training data (using service role)
-- Users can contribute their own data
CREATE POLICY "Users can contribute training data" ON public.ai_training_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. USER SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    
    -- Display settings
    emails_per_page INTEGER DEFAULT 50,
    conversation_view BOOLEAN DEFAULT TRUE,
    
    -- Auto-actions
    auto_mark_read_after_seconds INTEGER DEFAULT 3,
    auto_archive_sent BOOLEAN DEFAULT FALSE,
    
    -- AI settings
    ai_enabled BOOLEAN DEFAULT TRUE,
    ai_auto_categorize BOOLEAN DEFAULT TRUE,
    ai_auto_summarize BOOLEAN DEFAULT FALSE,
    ai_spam_threshold DECIMAL(3,2) DEFAULT 0.70,
    
    -- Keyboard shortcuts
    keyboard_shortcuts BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- ============================================================
-- 10. DEFAULT SYSTEM LABELS
-- ============================================================
-- Insert default labels for each new user
CREATE OR REPLACE FUNCTION public.create_default_labels()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.labels (user_id, name, type, color) VALUES
        (NEW.id, 'inbox', 'system', '#4285F4'),
        (NEW.id, 'sent', 'system', '#34A853'),
        (NEW.id, 'drafts', 'system', '#FBBC05'),
        (NEW.id, 'spam', 'system', '#EA4335'),
        (NEW.id, 'trash', 'system', '#9E9E9E'),
        (NEW.id, 'starred', 'system', '#FFD700'),
        (NEW.id, 'important', 'system', '#FF6B6B'),
        (NEW.id, 'social', 'system', '#4ECDC4'),
        (NEW.id, 'promotions', 'system', '#95E1D3'),
        (NEW.id, 'updates', 'system', '#F38181');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_labels
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_default_labels();

-- ============================================================
-- 11. HELPER FUNCTIONS
-- ============================================================

-- Function to get unread count per folder
CREATE OR REPLACE FUNCTION public.get_unread_counts(p_user_id UUID)
RETURNS TABLE (
    folder TEXT,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(e.ai_category, 'primary') as folder,
        COUNT(*) FILTER (WHERE NOT e.is_read) as unread_count
    FROM public.emails e
    WHERE e.user_id = p_user_id
        AND NOT e.is_trashed
        AND NOT e.is_spam
        AND NOT e.is_draft
    GROUP BY COALESCE(e.ai_category, 'primary');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-delete old trash (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_trash()
RETURNS void AS $$
BEGIN
    DELETE FROM public.emails
    WHERE is_trashed = TRUE
    AND trashed_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM public.threads
    WHERE is_trashed = TRUE
    AND trashed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. REAL-TIME SUBSCRIPTIONS
-- ============================================================
-- Enable real-time for emails table
ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;

-- ============================================================
-- STORAGE BUCKET SETUP
-- ============================================================
-- Note: Buckets must be created via Supabase Dashboard or API first
-- Required buckets:
-- 1. 'media' - for email attachments (private)
-- 2. 'avatars' - for user profile pictures (public)

-- ============================================================
-- Storage policies for 'media' bucket (attachments)
-- ============================================================
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload files to own folder" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to view their own files
CREATE POLICY "Users can view own files" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'media' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Alternative: If you want public access to attachments (for email viewing)
-- Uncomment the following policy and comment out the SELECT policy above:
-- CREATE POLICY "Public read access for media" ON storage.objects
--     FOR SELECT
--     TO public
--     USING (bucket_id = 'media');

-- ============================================================
-- Storage policies for 'avatars' bucket (public user profile pictures)
-- ============================================================
-- Allow authenticated users to upload avatars to their own folder
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow public read access to all avatars (for displaying in emails)
CREATE POLICY "Public read access for avatars" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================
-- © 2025 VeryGoodMail by Hoàn
-- ============================================================
