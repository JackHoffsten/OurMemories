package se.jackhoffsten.ourmemories.memory;

import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
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
            @RequestParam(defaultValue = "ASC") Sort.Direction order,
            @RequestParam(defaultValue = "") String search) {
        return memories.list(page, size, order, search);
    }

    @GetMapping("/{id}")
    MemoryResponse get(@PathVariable UUID id) {
        return memories.get(id);
    }

    @PostMapping
    ResponseEntity<MemoryResponse> create(
            @Valid @RequestBody MemoryRequest request, Principal principal) {
        MemoryResponse memory = memories.create(request, principal.getName());
        return ResponseEntity.created(URI.create("/api/memories/" + memory.id())).body(memory);
    }

    @PutMapping("/{id}")
    MemoryResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody MemoryUpdateRequest request,
            Principal principal) {
        return memories.update(id, request, principal.getName());
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable UUID id) {
        memories.delete(id);
        return ResponseEntity.noContent().build();
    }
}
