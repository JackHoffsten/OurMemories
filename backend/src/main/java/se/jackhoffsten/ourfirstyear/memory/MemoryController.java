package se.jackhoffsten.ourfirstyear.memory;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/memories")
class MemoryController {
    private final MemoryService memories;

    MemoryController(MemoryService memories) {
        this.memories = memories;
    }

    @GetMapping
    MemoryPage list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return memories.list(page, size);
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
