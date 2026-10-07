-- ══════════════════════════════════════════════════════════════
-- PAYKUDI SUPABASE DATABASE SCHEMA
-- Run this script in your Supabase SQL Editor (SQL Editor -> New Query)
-- ══════════════════════════════════════════════════════════════

-- 1. PROFILES TABLE (Stores user info, balance & bank details)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT,
  full_name TEXT DEFAULT 'PayKudi User',
  username TEXT UNIQUE,
  balance NUMERIC(14, 2) DEFAULT 0.00,
  account_number TEXT DEFAULT '2032614152',
  bank_name TEXT DEFAULT 'PayKudi / Providus',
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT DEFAULT 'unverified',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PAYMENT ROOMS TABLE (Stores escrow orders & trade rooms)
CREATE TABLE IF NOT EXISTS public.payment_rooms (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  item TEXT NOT NULL,
  amount TEXT NOT NULL,
  price TEXT NOT NULL,
  price_numeric NUMERIC(14, 2) DEFAULT 0,
  role TEXT DEFAULT 'Buying', -- 'Buying' or 'Selling'
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_name TEXT NOT NULL,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  counterparty TEXT,
  status TEXT DEFAULT 'awaiting_payment', -- 'awaiting_payment', 'payment_received', 'in_transit', 'confirm_delivery', 'completed', 'dispute'
  status_text TEXT DEFAULT 'Awaiting Payment',
  category TEXT DEFAULT 'ongoing', -- 'ongoing', 'completed', 'cancelled'
  bank TEXT DEFAULT 'Guaranteed Trust Bank (GTBank)',
  account_name TEXT,
  account_number TEXT,
  variant TEXT,
  has_agreed_terms BOOLEAN DEFAULT false,
  dispute_reason TEXT,
  dispute_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRANSACTIONS TABLE (Stores financial activities: sent, received, payout, refund)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_room_id TEXT REFERENCES public.payment_rooms(id) ON DELETE SET NULL,
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
  payment_room_id TEXT REFERENCES public.payment_rooms(id) ON DELETE CASCADE,
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
ALTER TABLE public.payment_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_trails ENABLE ROW LEVEL SECURITY;

-- Allow public read & write during prototype development / testing
-- (You can tighten these later with user-specific auth.uid() checks)
CREATE POLICY "Allow public read on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public update on profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on profiles" ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on payment_rooms" ON public.payment_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert on payment_rooms" ON public.payment_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on payment_rooms" ON public.payment_rooms FOR UPDATE USING (true);

CREATE POLICY "Allow public read on transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on transactions" ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on dispute_trails" ON public.dispute_trails FOR SELECT USING (true);
CREATE POLICY "Allow public insert on dispute_trails" ON public.dispute_trails FOR INSERT WITH CHECK (true);

-- Enable Realtime subscriptions on payment_rooms and transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_trails;
