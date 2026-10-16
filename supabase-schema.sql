-- ══════════════════════════════════════════════════════════════
-- PAYKUDI SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor (SQL Editor -> New Query)
-- ══════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE (Stores public user identity; ID is the user's phone number)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- User's phone number (e.g. '08032001585')
  email TEXT,
  full_name TEXT DEFAULT 'PayKudi User',
  username TEXT UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  avatar_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. WALLETS TABLE (Stores private wallet balances & virtual deposit account numbers)
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'NGN',
  virtual_account_number TEXT DEFAULT '2032614152',
  virtual_bank_name TEXT DEFAULT 'PayKudi / Providus',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1c. PAYOUT ACCOUNTS TABLE (Stores user's verified personal withdrawal bank accounts)
CREATE TABLE IF NOT EXISTS public.payout_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank TEXT NOT NULL,
  bank_code TEXT DEFAULT '',
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PAYMENT ROOMS TABLE (Stores active escrow orders & trade rooms)
-- Lean, normalized schema:
-- - Bank/account details are linked via seller_id/buyer_id to profiles/payout_accounts
-- - Dispute history and messages are stored in dispute_trails table
-- - Price is stored as numeric amount (formatted in client UI)
-- - Status display labels and roles are computed dynamically
CREATE TABLE IF NOT EXISTS public.payment_rooms (
  order_number TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'NGN',
  seller_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment', -- 'awaiting_payment', 'payment_received', 'in_transit', 'confirm_delivery', 'completed', 'dispute'
  variant TEXT,
  buyer_agreed_terms BOOLEAN DEFAULT false,
  seller_agreed_terms BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 2b. PRE-PAYMENT ROOMS TABLE (Stores payment rooms still in invite)
CREATE TABLE IF NOT EXISTS public.pre_payment_rooms (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  price TEXT NOT NULL,
  creator_id TEXT,
  buyer_id TEXT,
  seller_id TEXT,
  counterparty_joined BOOLEAN DEFAULT false,
  status_text TEXT DEFAULT 'Invite Sent',
  category TEXT DEFAULT 'pre_payment',
  resend_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  resent_at TIMESTAMPTZ
);

ALTER TABLE public.pre_payment_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on pre_payment_rooms" ON public.pre_payment_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on pre_payment_rooms" ON public.pre_payment_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on pre_payment_rooms" ON public.pre_payment_rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on pre_payment_rooms" ON public.pre_payment_rooms FOR DELETE USING (true);

-- 2c. KILLED PAYMENT ROOMS TABLE (Stores payment rooms killed/expired before creator joined)
CREATE TABLE IF NOT EXISTS public.killed_payment_rooms (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  item TEXT,
  amount TEXT NOT NULL,
  price TEXT,
  role TEXT DEFAULT 'Buying',
  creator TEXT,
  counterparty TEXT,
  reason TEXT DEFAULT 'timeout_creator_not_joined', -- 'timeout_creator_not_joined', 'declined', 'expired'
  killed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

ALTER TABLE public.killed_payment_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on killed_payment_rooms" ON public.killed_payment_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on killed_payment_rooms" ON public.killed_payment_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on killed_payment_rooms" ON public.killed_payment_rooms FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on killed_payment_rooms" ON public.killed_payment_rooms FOR DELETE USING (true);

-- Automatically delete/move out of pre_payment_rooms and payment_rooms when inserted into killed_payment_rooms
CREATE OR REPLACE FUNCTION public.clean_killed_payment_room()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.pre_payment_rooms WHERE id = NEW.id OR order_number = NEW.order_number;
  DELETE FROM public.payment_rooms WHERE order_number = NEW.order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clean_killed_payment_room ON public.killed_payment_rooms;
CREATE TRIGGER trg_clean_killed_payment_room
AFTER INSERT OR UPDATE ON public.killed_payment_rooms
FOR EACH ROW EXECUTE FUNCTION public.clean_killed_payment_room();

-- Automatically delete/move out of pre_payment_rooms when approved and inserted into payment_rooms
CREATE OR REPLACE FUNCTION public.move_prepayment_to_payment_room()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.pre_payment_rooms WHERE id = NEW.id OR order_number = NEW.order_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_move_prepayment_to_payment_room ON public.payment_rooms;
CREATE TRIGGER trg_move_prepayment_to_payment_room
AFTER INSERT OR UPDATE ON public.payment_rooms
FOR EACH ROW EXECUTE FUNCTION public.move_prepayment_to_payment_room();

-- 3. TRANSACTIONS TABLE (Stores financial activities: sent, received, payout, refund)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_room_id TEXT REFERENCES public.payment_rooms(order_number) ON DELETE SET NULL,
  title TEXT NOT NULL,
  time TEXT DEFAULT 'Today',
  amount TEXT NOT NULL,
  amount_numeric NUMERIC(14, 2) DEFAULT 0,
  type TEXT NOT NULL, -- 'received', 'sent', 'payout', 'refund'
  type_key TEXT,
  bank_code TEXT DEFAULT 'kuda',
  bank_name TEXT,
  status TEXT DEFAULT 'completed',
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DISPUTE TRAILS TABLE (Stores timeline messages for disputed orders)
CREATE TABLE IF NOT EXISTS public.dispute_trails (
  id BIGSERIAL PRIMARY KEY,
  payment_room_id TEXT REFERENCES public.payment_rooms(order_number) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  sender_type TEXT DEFAULT 'buyer', -- 'buyer', 'seller', 'cs'
  time TEXT DEFAULT 'Today',
  reason TEXT,
  message TEXT NOT NULL,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_trails ENABLE ROW LEVEL SECURITY;

-- Allow public read on user display identities (names, usernames, avatars)
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- Wallets and Payout Accounts access policies
CREATE POLICY "Allow read on wallets" ON public.wallets FOR SELECT USING (true);
CREATE POLICY "Allow insert on wallets" ON public.wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on wallets" ON public.wallets FOR UPDATE USING (true);

CREATE POLICY "Allow read on payout_accounts" ON public.payout_accounts FOR SELECT USING (true);
CREATE POLICY "Allow insert on payout_accounts" ON public.payout_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on payout_accounts" ON public.payout_accounts FOR UPDATE USING (true);
CREATE POLICY "Allow delete on payout_accounts" ON public.payout_accounts FOR DELETE USING (true);

CREATE POLICY "Allow public read on payment_rooms" ON public.payment_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on payment_rooms" ON public.payment_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on payment_rooms" ON public.payment_rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read on transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on transactions" ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on dispute_trails" ON public.dispute_trails FOR SELECT USING (true);
CREATE POLICY "Allow public insert on dispute_trails" ON public.dispute_trails FOR INSERT WITH CHECK (true);

-- Enable Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pre_payment_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.killed_payment_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_trails;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_accounts;
