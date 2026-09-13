CREATE TABLE capsule.memories (
    id UUID PRIMARY KEY,
    title VARCHAR(120) NOT NULL CHECK (length(trim(title)) > 0),
    story VARCHAR(10000) NOT NULL CHECK (length(trim(story)) > 0),
    memory_date DATE NOT NULL,
    location_name VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX memories_timeline_idx ON capsule.memories (memory_date DESC, id DESC);
