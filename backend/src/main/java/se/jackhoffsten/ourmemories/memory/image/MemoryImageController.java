package se.jackhoffsten.ourmemories.memory.image;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/memories/{memoryId}/images")
class MemoryImageController {
    private final MemoryImageService images;

    MemoryImageController(MemoryImageService images) {
        this.images = images;
    }

    @GetMapping
    List<ImageResponse> list(@PathVariable UUID memoryId) {
        return images.list(memoryId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ResponseEntity<ImageResponse> upload(
            @PathVariable UUID memoryId, @RequestPart("file") MultipartFile file) {
        var image = images.upload(memoryId, file);
        return ResponseEntity.created(
                        URI.create(
                                "/api/memories/" + memoryId + "/images/" + image.id() + "/content"))
                .body(image);
    }

    @GetMapping("/{imageId}/content")
    ResponseEntity<byte[]> read(@PathVariable UUID memoryId, @PathVariable UUID imageId) {
        var image = images.read(memoryId, imageId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(image.contentType()))
                .header(
                        "Content-Disposition",
                        "inline; filename=\""
                                + imageId
                                + (image.contentType().equals("image/png") ? ".png\"" : ".jpg\""))
                .body(image.bytes());
    }

    @DeleteMapping("/{imageId}")
    ResponseEntity<Void> delete(@PathVariable UUID memoryId, @PathVariable UUID imageId) {
        images.delete(memoryId, imageId);
        return ResponseEntity.noContent().build();
    }
}
