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
    public MemoryPage list(int page, int size, Sort.Direction order, String search) {
        if (search.length() > 200) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Search must be at most 200 characters.");
        }
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Page must be nonnegative and size must be 1–100.");
        }

        if ((long) page * size > Integer.MAX_VALUE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page offset is too large.");
        }

        var pageable = PageRequest.of(page, size, Sort.by(order, "memoryDate", "id"));
        var result =
                search.isBlank()
                        ? memories.findAll(pageable)
                        : memories.search(search.strip(), pageable);

        return new MemoryPage(
                result.getContent().stream().map((Memory m) -> m.toResponse()).toList(),
                page,
                size,
                result.getTotalElements(),
                result.getTotalPages(),
                search.isBlank() ? result.getTotalElements() : memories.count());
    }

    @Override
    public MemoryResponse get(UUID id) {
        return find(id).toResponse();
    }

    @Override
    @Transactional
    public MemoryResponse create(MemoryRequest request, String username) {
        return memories.saveAndFlush(new Memory(request, username)).toResponse();
    }

    @Override
    @Transactional
    public MemoryResponse update(UUID id, MemoryUpdateRequest request, String username) {
        Memory memory = find(id);
        if (memory.version() != request.version()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Memory has changed. Reload it before editing.");
        }
        memory.replace(request.content());
        memory.assignCreatorIfMissing(username);
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
