package se.jackhoffsten.ourmemories.memory;

import java.util.UUID;
import org.springframework.data.domain.Sort;

public interface MemoryService {
    MemoryPage list(int page, int size, Sort.Direction order, String search);

    MemoryResponse get(UUID id);

    MemoryResponse create(MemoryRequest request, String username);

    MemoryResponse update(UUID id, MemoryUpdateRequest request, String username);

    void delete(UUID id);
}
