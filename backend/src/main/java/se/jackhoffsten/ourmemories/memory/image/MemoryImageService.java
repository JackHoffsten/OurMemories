package se.jackhoffsten.ourmemories.memory.image;

import java.util.List;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

public interface MemoryImageService {
    List<ImageResponse> list(UUID memoryId);

    ImageResponse upload(UUID memoryId, MultipartFile file);

    ImageContent read(UUID memoryId, UUID imageId);

    void delete(UUID memoryId, UUID imageId);
}
