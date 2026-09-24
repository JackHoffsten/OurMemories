package se.jackhoffsten.ourmemories.memory;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Component
class ImageNormalizer {
    static final int MAX_BYTES = 10 * 1024 * 1024;

    NormalizedImage normalize(MultipartFile file) {
        if (file.isEmpty()) throw invalid();
        if (file.getSize() > MAX_BYTES) throw tooLarge();
        try (var input = new MemoryCacheImageInputStream(file.getInputStream())) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            var reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!format.equals("jpeg") && !format.equals("png")) throw invalid();
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width < 1 || height < 1 || (long) width * height > 20_000_000) throw tooLarge();
                BufferedImage decoded = reader.read(0);
                var clean =
                        new BufferedImage(
                                width,
                                height,
                                format.equals("png")
                                        ? BufferedImage.TYPE_INT_ARGB
                                        : BufferedImage.TYPE_INT_RGB);
                var graphics = clean.createGraphics();
                try {
                    graphics.drawImage(decoded, 0, 0, null);
                } finally {
                    graphics.dispose();
                    decoded.flush();
                }
                var output = new ByteArrayOutputStream();
                try {
                    if (!ImageIO.write(clean, format, output)) throw invalid();
                } finally {
                    clean.flush();
                }
                if (output.size() > MAX_BYTES) throw tooLarge();
                return new NormalizedImage("image/" + format, width, height, output.toByteArray());
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalid();
        }
    }

    private ResponseStatusException invalid() {
        return new ResponseStatusException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Choose a valid JPEG or PNG image.");
    }

    private ResponseStatusException tooLarge() {
        return new ResponseStatusException(
                HttpStatus.PAYLOAD_TOO_LARGE, "Images must be at most 10 MiB and 20 megapixels.");
    }

    record NormalizedImage(String contentType, int width, int height, byte[] bytes) {}
}
