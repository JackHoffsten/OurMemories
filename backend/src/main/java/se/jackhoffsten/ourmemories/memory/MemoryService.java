package se.jackhoffsten.ourmemories.memory;

import java.util.UUID;
import org.springframework.data.domain.Sort;

public interface MemoryService {
    MemoryPage list(int page, int size, Sort.Direction order);

    MemoryResponse get(UUID id);

    MemoryResponse create(MemoryRequest request);

    MemoryResponse update(UUID id, MemoryUpdateRequest request);

    void delete(UUID id);
}
