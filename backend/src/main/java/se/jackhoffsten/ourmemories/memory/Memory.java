package se.jackhoffsten.ourmemories.memory;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "memories", schema = "capsule")
class Memory {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 10000)
    private String story;

    @Column(name = "memory_date", nullable = false)
    private LocalDate memoryDate;

    @Column(name = "location_name", length = 200)
    private String locationName;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    @Column(name = "created_by", length = 32)
    private String createdBy;

    protected Memory() {}

    Memory(MemoryRequest request, String username) {
        createdBy = username;
        replace(request);
        createdAt = updatedAt;
    }

    void replace(MemoryRequest request) {
        title = request.title().strip();
        story = request.story().strip();
        memoryDate = request.memoryDate();
        locationName =
                request.locationName() == null || request.locationName().isBlank()
                        ? null
                        : request.locationName().strip();
        updatedAt = Instant.now();
    }

    long version() {
        return version;
    }

    void assignCreatorIfMissing(String username) {
        if (createdBy == null) createdBy = username;
    }

    MemoryResponse toResponse() {
        return new MemoryResponse(
                id,
                title,
                story,
                memoryDate,
                locationName,
                createdAt,
                updatedAt,
                version,
                createdBy);
    }
}
