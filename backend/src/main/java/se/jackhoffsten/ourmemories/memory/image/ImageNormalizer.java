package se.jackhoffsten.ourmemories.memory.image;

import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.exif.ExifIFD0Directory;
import java.awt.geom.AffineTransform;
import java.awt.image.AffineTransformOp;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
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

        final byte[] raw;
        try {
            raw = file.getBytes();
        } catch (IOException exception) {
            throw invalid();
        }

        int orientation = readExifOrientation(raw);

        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(raw))) {
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
                BufferedImage oriented = applyOrientation(decoded, orientation);
                if (oriented != decoded) decoded.flush();

                int outWidth = oriented.getWidth();
                int outHeight = oriented.getHeight();

                var clean =
                        new BufferedImage(
                                outWidth,
                                outHeight,
                                format.equals("png")
                                        ? BufferedImage.TYPE_INT_ARGB
                                        : BufferedImage.TYPE_INT_RGB);
                var graphics = clean.createGraphics();
                try {
                    graphics.drawImage(oriented, 0, 0, null);
                } finally {
                    graphics.dispose();
                    oriented.flush();
                }

                var output = new ByteArrayOutputStream();
                try {
                    if (!ImageIO.write(clean, format, output)) throw invalid();
                } finally {
                    clean.flush();
                }
                if (output.size() > MAX_BYTES) throw tooLarge();
                return new NormalizedImage(
                        "image/" + format, outWidth, outHeight, output.toByteArray());
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalid();
        }
    }

    /**
     * Reads the EXIF Orientation tag (1-8) via metadata-extractor. Returns 1 (normal) if the file
     * has no EXIF, no orientation tag, or the tag is malformed.
     */
    private static int readExifOrientation(byte[] raw) {
        try {
            var metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(raw));
            var exif = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            if (exif == null) return 1;
            Integer value = exif.getInteger(ExifIFD0Directory.TAG_ORIENTATION);
            return (value != null && value >= 1 && value <= 8) ? value : 1;
        } catch (Exception ignored) {
            return 1;
        }
    }

    /** Rotates/mirrors the pixels so the image is upright when orientation is baked out. */
    private static BufferedImage applyOrientation(BufferedImage source, int orientation) {
        if (orientation == 1) return source;

        int w = source.getWidth();
        int h = source.getHeight();
        boolean swapDimensions = orientation >= 5 && orientation <= 8;
        int targetW = swapDimensions ? h : w;
        int targetH = swapDimensions ? w : h;

        var transform = new AffineTransform();
        switch (orientation) {
            case 2 -> { // flip horizontal
                transform.translate(w, 0);
                transform.scale(-1, 1);
            }
            case 3 -> { // rotate 180
                transform.translate(w, h);
                transform.rotate(Math.PI);
            }
            case 4 -> { // flip vertical
                transform.translate(0, h);
                transform.scale(1, -1);
            }
            case 5 -> { // transpose
                transform.rotate(Math.PI / 2);
                transform.scale(1, -1);
            }
            case 6 -> { // rotate 90 CW
                transform.translate(h, 0);
                transform.rotate(Math.PI / 2);
            }
            case 7 -> { // transverse
                transform.translate(h, 0);
                transform.rotate(Math.PI / 2);
                transform.translate(w, 0);
                transform.scale(-1, 1);
            }
            case 8 -> { // rotate 90 CCW
                transform.translate(0, w);
                transform.rotate(-Math.PI / 2);
            }
            default -> {
                return source;
            }
        }

        var op = new AffineTransformOp(transform, AffineTransformOp.TYPE_BICUBIC);
        var result = new BufferedImage(targetW, targetH, source.getType());
        return op.filter(source, result);
    }

    private ResponseStatusException invalid() {
        return new ResponseStatusException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Choose a valid JPEG or PNG image.");
    }

    private ResponseStatusException tooLarge() {
        return new ResponseStatusException(
                HttpStatus.CONTENT_TOO_LARGE, "Images must be at most 10 MiB and 20 megapixels.");
    }

    record NormalizedImage(String contentType, int width, int height, byte[] bytes) {}
}
