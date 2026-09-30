package se.jackhoffsten.ourmemories.memory.image;

import java.util.UUID;

public record ImageResponse(UUID id, String contentType, int width, int height, long size) {}
