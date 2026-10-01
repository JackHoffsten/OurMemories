package se.jackhoffsten.ourmemories.memory;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/memories")
class MemoryController {
    private final MemoryService memories;

    MemoryController(MemoryService memories) {
        this.memories = memories;
    }

    @GetMapping
    MemoryPage list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "ASC") Sort.Direction order) {
        return memories.list(page, size, order);
    }

    @GetMapping("/{id}")
    MemoryResponse get(@PathVariable UUID id) {
        return memories.get(id);
    }

    @PostMapping
    ResponseEntity<MemoryResponse> create(@Valid @RequestBody MemoryRequest request) {
        MemoryResponse memory = memories.create(request);
        return ResponseEntity.created(URI.create("/api/memories/" + memory.id())).body(memory);
    }

    @PutMapping("/{id}")
    MemoryResponse update(@PathVariable UUID id, @Valid @RequestBody MemoryUpdateRequest request) {
        return memories.update(id, request);
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        memories.delete(id);
        return ResponseEntity.noContent().build();
    }
}
