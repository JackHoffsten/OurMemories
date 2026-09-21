package se.jackhoffsten.ourfirstyear.memory;

import java.util.UUID;

public interface MemoryService {
    MemoryPage list(int page, int size);

    MemoryResponse get(UUID id);

    MemoryResponse create(MemoryRequest request);

    MemoryResponse update(UUID id, MemoryUpdateRequest request);

    void delete(UUID id);
}
