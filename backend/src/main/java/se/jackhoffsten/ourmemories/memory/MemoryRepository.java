package se.jackhoffsten.ourmemories.memory;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface MemoryRepository extends JpaRepository<Memory, UUID> {
    @Query(
            """
            SELECT m FROM Memory m
            WHERE locate(lower(:search), lower(m.title)) > 0
               OR locate(lower(:search), lower(m.story)) > 0
               OR locate(lower(:search), lower(coalesce(m.locationName, ''))) > 0
            """)
    Page<Memory> search(String search, Pageable pageable);
}
