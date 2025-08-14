CREATE TYPE payment_status AS ENUM ('created', 'paid', 'failed', 'refunded');

CREATE TABLE IF NOT EXISTS event_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  amount INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  description TEXT,
  status payment_status NOT NULL DEFAULT 'created',
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_event_purchases_event_id ON event_purchases(event_id);