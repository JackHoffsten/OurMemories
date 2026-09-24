CREATE TABLE capsule.memory_images (
    id UUID PRIMARY KEY,
    memory_id UUID NOT NULL REFERENCES capsule.memories(id) ON DELETE CASCADE,
    content_type VARCHAR(10) NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png')),
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    content BYTEA NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 10485760),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX memory_images_memory_idx ON capsule.memory_images (memory_id, created_at, id);
