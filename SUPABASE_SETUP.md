# 🗄️ Supabase Database & Auth Setup for BinRo

> **Quick link to full setup SQL script**: [`/supabase/full-setup.sql`](./supabase/full-setup.sql)  
> **Detailed step-by-step setup guide**: [`/supabase/SETUP_GUIDE.md`](./supabase/SETUP_GUIDE.md)

---

## ⚡ 3-Step Setup for a Brand New Supabase Project

### Step 1: Create your Project & Run SQL
1. Create a project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** -> **+ New query**.
3. Copy all of [`/supabase/full-setup.sql`](./supabase/full-setup.sql) and click **Run**.
4. All tables, views, RLS policies, storage bucket, and auth sync triggers will be created automatically.

### Step 2: Get your Project API Keys
In **Project Settings** -> **API**:
- Copy **Project URL**
- Copy **anon / public key**

### Step 3: Put Keys in Environment Files

**For Android / Expo App (`.env` in root):**
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**For Next.js Web App (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 🛡️ Key Features of the Schema
- **Auto Auth Sync**: Trigger on `auth.users` creates user in `public.users` with unique handle.
- **Strict RLS**: Users only modify their own data; public can safely inspect QR codes and read verified comments.
- **Privacy View**: `public_profiles` view protects private user emails.
- **Atomic Counters**: Safe concurrent scan/like counting via `increment_field()`.
- **Soft Deletes**: Account and comment soft-deletion for safety and recovery.
