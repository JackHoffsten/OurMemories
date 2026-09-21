package se.jackhoffsten.ourfirstyear.memory;

import java.util.List;

public record MemoryPage(
        List<MemoryResponse> items, int page, int size, long totalElements, int totalPages) {}
