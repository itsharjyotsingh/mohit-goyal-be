CREATE TABLE events (
    id UUID PRIMARY KEY,
    original_price INT NOT NULL,
    price INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT[],
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    event_time TIME NOT NULL,
    event_duration INT NOT NULL,
    is_hidden BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE EXTENSION IF NOT EXISTS "uuid-ossp";