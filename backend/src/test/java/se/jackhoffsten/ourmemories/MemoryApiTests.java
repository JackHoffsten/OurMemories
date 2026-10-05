package se.jackhoffsten.ourmemories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.jayway.jsonpath.JsonPath;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import se.jackhoffsten.ourmemories.account.AccountProvisioningService;
import se.jackhoffsten.ourmemories.account.AccountSlot;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class MemoryApiTests {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.6-alpine3.24");

    @Autowired MockMvc mvc;
    @Autowired AccountProvisioningService accounts;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private MockHttpSession session;
    private String csrf;

    @BeforeEach
    void setUp() throws Exception {
        jdbc.update("DELETE FROM capsule.memories");
        jdbc.update("DELETE FROM capsule.accounts");
        accounts.provision("first.user", AccountSlot.FIRST, "a long test passphrase".toCharArray());
        accounts.provision(
                "second.user", AccountSlot.SECOND, "a long test passphrase".toCharArray());
        login("first.user");
    }

    @Test
    void bothAccountsCanReadUpdateAndDeleteSharedMemories() throws Exception {
        String id = create(" First walk ", "2026-01-10");
        login("second.user");
        mvc.perform(get("/api/memories/" + id).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("First walk"))
                .andExpect(jsonPath("$.createdBy").value("first.user"))
                .andExpect(jsonPath("$.locationName").value("Stockholm"))
                .andExpect(jsonPath("$.version").value(0));
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.title").value("Updated walk"))
                .andExpect(jsonPath("$.createdBy").value("first.user"))
                .andExpect(jsonPath("$.locationName").isEmpty());
        assertThat(
                        jdbc.queryForObject(
                                "SELECT title FROM capsule.memories WHERE id = ?",
                                String.class,
                                UUID.fromString(id)))
                .isEqualTo("Updated walk");
        mvc.perform(write(delete("/api/memories/" + id))).andExpect(status().isNoContent());
        mvc.perform(get("/api/memories/" + id).session(session)).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memories", Long.class))
                .isZero();
    }

    @Test
    void listsMemoriesOldestFirstByDefaultAndSupportsNewestFirstWithBoundedPagination()
            throws Exception {
        create("Older", "2025-02-03");
        create("Newer", "2026-02-03");
        mvc.perform(get("/api/memories?page=0&size=1").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Older"))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(get("/api/memories?page=1&size=1").session(session))
                .andExpect(jsonPath("$.items[0].title").value("Newer"));
        mvc.perform(get("/api/memories?page=0&size=1&order=DESC").session(session))
                .andExpect(jsonPath("$.items[0].title").value("Newer"));
        mvc.perform(get("/api/memories?page=1&size=1&order=DESC").session(session))
                .andExpect(jsonPath("$.items[0].title").value("Older"));
        mvc.perform(get("/api/memories?order=invalid").session(session))
                .andExpect(status().isBadRequest());
        for (String query :
                new String[] {"page=-1", "size=0", "size=101", "page=invalid", "page=2147483647"}) {
            mvc.perform(get("/api/memories?" + query).session(session))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void firstEditAssignsMissingCreatorAndLaterEditsKeepIt() throws Exception {
        String id = create("Legacy memory", "2026-01-10");
        jdbc.update(
                "UPDATE capsule.memories SET created_by = NULL WHERE id = ?", UUID.fromString(id));
        login("second.user");
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdBy").value("second.user"));
        login("first.user");
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdBy").value("second.user"));
        mvc.perform(get("/api/memories/" + id).session(session))
                .andExpect(jsonPath("$.createdBy").value("second.user"));
    }

    @Test
    void rejectsStaleEditsWithoutOverwritingStoredMemory() throws Exception {
        String id = create("First walk", "2026-01-10");
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0)))
                .andExpect(status().isOk());
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
        assertThat(
                        jdbc.queryForObject(
                                "SELECT version FROM capsule.memories WHERE id = ?",
                                Long.class,
                                UUID.fromString(id)))
                .isEqualTo(1);
    }

    @Test
    void rejectsInvalidContentAndMissingMemories() throws Exception {
        for (String body :
                new String[] {
                    "{}",
                    "{",
                    body(" ", "2026-01-10"),
                    body("x".repeat(121), "2026-01-10"),
                    body("Walk", "invalid-date"),
                    json.writeValueAsString(
                            Map.of(
                                    "title",
                                    "Walk",
                                    "story",
                                    "x".repeat(10001),
                                    "memoryDate",
                                    "2026-01-10")),
                    json.writeValueAsString(
                            Map.of(
                                    "title",
                                    "Walk",
                                    "story",
                                    "Story",
                                    "memoryDate",
                                    "2026-01-10",
                                    "locationName",
                                    "x".repeat(201)))
                }) {
            mvc.perform(write(post("/api/memories")).content(body))
                    .andExpect(status().isBadRequest());
        }
        String missing = "/api/memories/" + UUID.randomUUID();
        mvc.perform(get(missing).session(session)).andExpect(status().isNotFound());
        mvc.perform(write(put(missing)).content(updateBody(0))).andExpect(status().isNotFound());
        mvc.perform(write(delete(missing))).andExpect(status().isNotFound());
        mvc.perform(write(put(missing)).content(body("Walk", "2026-01-10")))
                .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memories", Long.class))
                .isZero();
    }

    @Test
    void requiresAuthenticationAndCsrfForMemoryOperations() throws Exception {
        String path = "/api/memories/" + create("First walk", "2026-01-10");
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/memories")).andExpect(status().isUnauthorized());
        for (MockHttpServletRequestBuilder request :
                new MockHttpServletRequestBuilder[] {
                    post("/api/memories"), put(path), delete(path)
                }) {
            mvc.perform(
                            request.session(session)
                                    .contentType("application/json")
                                    .content(body("Walk", "2026-01-10")))
                    .andExpect(status().isForbidden());
        }
        MockHttpSession anonymous = new MockHttpSession();
        String anonymousToken = token(anonymous);
        mvc.perform(
                        post("/api/memories")
                                .session(anonymous)
                                .header("X-CSRF-TOKEN", anonymousToken)
                                .contentType("application/json")
                                .content(body("Walk", "2026-01-10")))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memories", Long.class))
                .isEqualTo(1);
    }

    @Test
    void storesPrivateImagesAndDeletesThemWithTheirMemory() throws Exception {
        String id = create("Photos", "2026-01-10");
        String otherId = create("Other memory", "2026-01-11");
        for (String format : new String[] {"png", "jpeg"}) {
            byte[] bytes = imageBytes(format);
            var upload =
                    new MockMultipartFile("file", "../../private." + format, "text/plain", bytes);
            String result =
                    mvc.perform(
                                    multipart("/api/memories/" + id + "/images")
                                            .file(upload)
                                            .session(session)
                                            .header("X-CSRF-TOKEN", csrf))
                            .andExpect(status().isCreated())
                            .andExpect(jsonPath("$.contentType").value("image/" + format))
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            String imageId = JsonPath.read(result, "$.id");
            String imagePath = "/api/memories/" + id + "/images/" + imageId;
            mvc.perform(
                            patch(imagePath)
                                    .session(session)
                                    .contentType("application/json")
                                    .content("{\"description\":\"Our first walk\"}"))
                    .andExpect(status().isForbidden());
            mvc.perform(
                            write(patch(imagePath))
                                    .contentType("application/json")
                                    .content("{\"description\":\"  Our first walk  \"}"))
                    .andExpect(status().isNoContent());
            mvc.perform(get("/api/memories/" + id + "/images").session(session))
                    .andExpect(
                            jsonPath("$[?(@.id == '" + imageId + "')].description")
                                    .value(org.hamcrest.Matchers.contains("Our first walk")));
            mvc.perform(
                            write(patch(imagePath))
                                    .contentType("application/json")
                                    .content("{\"description\":\"" + "x".repeat(1001) + "\"}"))
                    .andExpect(status().isBadRequest());
            mvc.perform(
                            write(patch("/api/memories/" + otherId + "/images/" + imageId))
                                    .contentType("application/json")
                                    .content("{\"description\":\"Wrong memory\"}"))
                    .andExpect(status().isNotFound());
            String url = "/api/memories/" + id + "/images/" + imageId + "/content";
            mvc.perform(get(url)).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/memories/" + id + "/images"))
                    .andExpect(status().isUnauthorized());
            login("second.user");
            byte[] downloaded =
                    mvc.perform(get(url).session(session))
                            .andExpect(status().isOk())
                            .andExpect(header().string("Cache-Control", "no-store"))
                            .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                            .andReturn()
                            .getResponse()
                            .getContentAsByteArray();
            assertThat(ImageIO.read(new ByteArrayInputStream(downloaded)).getWidth()).isEqualTo(4);
            assertThat(new String(downloaded, java.nio.charset.StandardCharsets.ISO_8859_1))
                    .doesNotContain("private-metadata-marker");
            mvc.perform(
                            get("/api/memories/" + otherId + "/images/" + imageId + "/content")
                                    .session(session))
                    .andExpect(status().isNotFound());
            mvc.perform(delete("/api/memories/" + id + "/images/" + imageId).session(session))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/memories/" + id + "/images").session(session))
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(write(delete("/api/memories/" + id))).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memory_images", Long.class))
                .isZero();
    }

    @Test
    void rejectsInvalidUploadsAndEnforcesImageLimit() throws Exception {
        String id = create("Photos", "2026-01-10");
        String url = "/api/memories/" + id + "/images";
        var valid = new MockMultipartFile("file", "photo.png", "image/png", imageBytes("png"));
        mvc.perform(multipart(url).file(valid).session(session)).andExpect(status().isForbidden());
        MockHttpSession anonymous = new MockHttpSession();
        mvc.perform(
                        multipart(url)
                                .file(valid)
                                .session(anonymous)
                                .header("X-CSRF-TOKEN", token(anonymous)))
                .andExpect(status().isUnauthorized());
        for (byte[] invalid : new byte[][] {{}, "<svg onload='alert(1)'/>".getBytes(), {1, 2, 3}}) {
            mvc.perform(
                            multipart(url)
                                    .file(
                                            new MockMultipartFile(
                                                    "file", "fake.png", "image/png", invalid))
                                    .session(session)
                                    .header("X-CSRF-TOKEN", csrf))
                    .andExpect(status().isUnsupportedMediaType());
        }
        mvc.perform(
                        multipart(url)
                                .file(new MockMultipartFile("file", new byte[10 * 1024 * 1024 + 1]))
                                .session(session)
                                .header("X-CSRF-TOKEN", csrf))
                .andExpect(status().isContentTooLarge());
        String imageId = null;
        for (int index = 0; index < 10; index++) {
            String result =
                    mvc.perform(
                                    multipart(url)
                                            .file(valid)
                                            .session(session)
                                            .header("X-CSRF-TOKEN", csrf))
                            .andExpect(status().isCreated())
                            .andReturn()
                            .getResponse()
                            .getContentAsString();
            imageId = JsonPath.read(result, "$.id");
        }
        mvc.perform(multipart(url).file(valid).session(session).header("X-CSRF-TOKEN", csrf))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(write(delete(url + "/" + imageId))).andExpect(status().isNoContent());
        mvc.perform(get(url + "/" + imageId + "/content").session(session))
                .andExpect(status().isNotFound());
    }

    private byte[] imageBytes(String format) throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 3, BufferedImage.TYPE_INT_RGB), format, bytes);
        bytes.write("private-metadata-marker".getBytes());
        return bytes.toByteArray();
    }

    private String create(String title, String date) throws Exception {
        var result =
                mvc.perform(write(post("/api/memories")).content(body(title, date)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.createdAt").exists())
                        .andReturn();
        String id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        assertThat(result.getResponse().getHeader("Location")).isEqualTo("/api/memories/" + id);
        return id;
    }

    @Test
    void searchesMemoriesWithLiteralCaseInsensitiveText() throws Exception {
        create("First walk", "2025-01-10");
        create("100% sunshine", "2026-01-10");
        for (String term : new String[] {"FIRST", "sunshine", "%"}) {
            mvc.perform(get("/api/memories").param("search", term).session(session))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1));
        }
        mvc.perform(
                        get("/api/memories")
                                .param("search", "stockholm")
                                .param("size", "1")
                                .session(session))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(get("/api/memories").param("search", "no match").session(session))
                .andExpect(jsonPath("$.totalMemories").value(2))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/memories").param("search", "x".repeat(201)).session(session))
                .andExpect(status().isBadRequest());
    }

    private String body(String title, String date) {
        return json.writeValueAsString(
                Map.of(
                        "title",
                        title,
                        "story",
                        "A fictional walk together.",
                        "memoryDate",
                        date,
                        "locationName",
                        " Stockholm "));
    }

    private String updateBody(long version) {
        return json.writeValueAsString(
                Map.of(
                        "title",
                        "Updated walk",
                        "story",
                        "An updated story.",
                        "memoryDate",
                        "2026-01-11",
                        "locationName",
                        "",
                        "version",
                        version));
    }

    private MockHttpServletRequestBuilder write(MockHttpServletRequestBuilder request) {
        return request.session(session)
                .header("X-CSRF-TOKEN", csrf)
                .contentType("application/json");
    }

    private void login(String username) throws Exception {
        session = new MockHttpSession();
        mvc.perform(
                        post("/api/auth/login")
                                .session(session)
                                .header("X-CSRF-TOKEN", token(session))
                                .param("username", username)
                                .param("password", "a long test passphrase"))
                .andExpect(status().isNoContent());
        csrf = token(session);
    }

    private String token(MockHttpSession target) throws Exception {
        String result =
                mvc.perform(get("/api/auth/csrf").session(target))
                        .andExpect(status().isOk())
                        .andReturn()
                        .getResponse()
                        .getContentAsString();
        return JsonPath.read(result, "$.token");
    }
}
