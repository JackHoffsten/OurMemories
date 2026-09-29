package se.jackhoffsten.ourmemories.memory;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
class JdbcMemoryImageService implements MemoryImageService {
    private final JdbcTemplate jdbc;
    private final ImageNormalizer normalizer;

    JdbcMemoryImageService(JdbcTemplate jdbc, ImageNormalizer normalizer) {
        this.jdbc = jdbc;
        this.normalizer = normalizer;
    }

    @Override
    public List<ImageResponse> list(UUID memoryId) {
        requireMemory(memoryId, false);
        return jdbc.query(
                """
                SELECT id, content_type, width, height, octet_length(content) AS size
                FROM capsule.memory_images WHERE memory_id = ? ORDER BY created_at, id
                """,
                (row, index) ->
                        new ImageResponse(
                                row.getObject("id", UUID.class),
                                row.getString("content_type"),
                                row.getInt("width"),
                                row.getInt("height"),
                                row.getLong("size")),
                memoryId);
    }

    @Override
    @Transactional
    public ImageResponse upload(UUID memoryId, MultipartFile file) {
        requireMemory(memoryId, true);
        if (jdbc.queryForObject(
                        "SELECT count(*) FROM capsule.memory_images WHERE memory_id = ?",
                        Long.class,
                        memoryId)
                >= 10) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT, "A memory can have at most 10 images.");
        }
        var image = normalizer.normalize(file);
        UUID id = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO capsule.memory_images (id, memory_id, content_type, width, height, content)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                id,
                memoryId,
                image.contentType(),
                image.width(),
                image.height(),
                image.bytes());
        return new ImageResponse(
                id, image.contentType(), image.width(), image.height(), image.bytes().length);
    }

    @Override
    public ImageContent read(UUID memoryId, UUID imageId) {
        return jdbc
                .query(
                        "SELECT content_type, content FROM capsule.memory_images WHERE memory_id = ? AND id = ?",
                        (row, index) ->
                                new ImageContent(
                                        row.getString("content_type"), row.getBytes("content")),
                        memoryId,
                        imageId)
                .stream()
                .findFirst()
                .orElseThrow(this::notFound);
    }

    @Override
    @Transactional
    public void delete(UUID memoryId, UUID imageId) {
        if (jdbc.update(
                        "DELETE FROM capsule.memory_images WHERE memory_id = ? AND id = ?",
                        memoryId,
                        imageId)
                == 0) {
            throw notFound();
        }
    }

    private void requireMemory(UUID id, boolean lock) {
        var matches =
                jdbc.queryForList(
                        "SELECT id FROM capsule.memories WHERE id = ?"
                                + (lock ? " FOR UPDATE" : ""),
                        UUID.class,
                        id);
        if (matches.isEmpty()) throw notFound();
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Memory or image not found.");
    }
}
