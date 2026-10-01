package se.jackhoffsten.ourmemories.memory;

import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
class JpaMemoryService implements MemoryService {
    private final MemoryRepository memories;

    JpaMemoryService(MemoryRepository memories) {
        this.memories = memories;
    }

    @Override
    public MemoryPage list(int page, int size, Sort.Direction order) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Page must be nonnegative and size must be 1–100.");
        }

        if ((long) page * size > Integer.MAX_VALUE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page offset is too large.");
        }

        var result =
                memories.findAll(PageRequest.of(page, size, Sort.by(order, "memoryDate", "id")));

        return new MemoryPage(
                result.getContent().stream().map((Memory m) -> m.toResponse()).toList(),
                page,
                size,
                result.getTotalElements(),
                result.getTotalPages());
    }

    @Override
    public MemoryResponse get(UUID id) {
        return find(id).toResponse();
    }

    @Override
    @Transactional
    public MemoryResponse create(MemoryRequest request) {
        return memories.saveAndFlush(new Memory(request)).toResponse();
    }

    @Override
    @Transactional
    public MemoryResponse update(UUID id, MemoryUpdateRequest request) {
        Memory memory = find(id);
        if (memory.version() != request.version()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Memory has changed. Reload it before editing.");
        }
        memory.replace(request.content());
        memories.flush();
        return memory.toResponse();
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        memories.delete(find(id));
    }

    private Memory find(UUID id) {
        return memories.findById(id)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND, "Memory not found."));
    }
}
