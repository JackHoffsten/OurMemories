package se.jackhoffsten.ourmemories.memory;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record MemoryResponse(
        UUID id,
        String title,
        String story,
        LocalDate memoryDate,
        String locationName,
        Instant createdAt,
        Instant updatedAt,
        long version) {}
