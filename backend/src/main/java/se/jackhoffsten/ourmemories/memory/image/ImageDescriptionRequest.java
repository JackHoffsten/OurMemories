package se.jackhoffsten.ourmemories.memory.image;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ImageDescriptionRequest(@NotNull @Size(max = 1000) String description) {}
