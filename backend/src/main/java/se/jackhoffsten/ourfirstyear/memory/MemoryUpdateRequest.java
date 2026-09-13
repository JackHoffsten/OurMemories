package se.jackhoffsten.ourfirstyear.memory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record MemoryUpdateRequest(
        @NotBlank @Size(max = 120) String title,
        @NotBlank @Size(max = 10000) String story,
        @NotNull LocalDate memoryDate,
        @Size(max = 200) String locationName,
        @NotNull @PositiveOrZero Long version) {
    MemoryRequest content() {
        return new MemoryRequest(title, story, memoryDate, locationName);
    }
}
