package se.jackhoffsten.ourfirstyear;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import se.jackhoffsten.ourfirstyear.account.AccountProvisioningService;
import se.jackhoffsten.ourfirstyear.account.AccountSlot;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class MemoryApiTests {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine");

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
        accounts.provision("second.user", AccountSlot.SECOND, "a long test passphrase".toCharArray());
        login("first.user");
    }

    @Test
    void bothAccountsCanReadUpdateAndDeleteSharedMemories() throws Exception {
        String id = create(" First walk ", "2026-01-10");
        login("second.user");
        mvc.perform(get("/api/memories/" + id).session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("First walk"))
                .andExpect(jsonPath("$.locationName").value("Stockholm"))
                .andExpect(jsonPath("$.version").value(0));
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.title").value("Updated walk"))
                .andExpect(jsonPath("$.locationName").isEmpty());
        assertThat(jdbc.queryForObject("SELECT title FROM capsule.memories WHERE id = ?", String.class, UUID.fromString(id)))
                .isEqualTo("Updated walk");
        mvc.perform(write(delete("/api/memories/" + id))).andExpect(status().isNoContent());
        mvc.perform(get("/api/memories/" + id).session(session)).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memories", Long.class)).isZero();
    }

    @Test
    void listsMemoriesNewestFirstWithBoundedPagination() throws Exception {
        create("Older", "2025-02-03");
        create("Newer", "2026-02-03");
        mvc.perform(get("/api/memories?page=0&size=1").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Newer"))
                .andExpect(jsonPath("$.totalElements").value(2)).andExpect(jsonPath("$.totalPages").value(2));
        mvc.perform(get("/api/memories?page=1&size=1").session(session))
                .andExpect(jsonPath("$.items[0].title").value("Older"));
        for (String query : new String[] { "page=-1", "size=0", "size=101", "page=invalid", "page=2147483647" }) {
            mvc.perform(get("/api/memories?" + query).session(session)).andExpect(status().isBadRequest());
        }
    }

    @Test
    void rejectsStaleEditsWithoutOverwritingStoredMemory() throws Exception {
        String id = create("First walk", "2026-01-10");
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0))).andExpect(status().isOk());
        mvc.perform(write(put("/api/memories/" + id)).content(updateBody(0)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.status").value(409));
        assertThat(jdbc.queryForObject("SELECT version FROM capsule.memories WHERE id = ?", Long.class, UUID.fromString(id)))
                .isEqualTo(1);
    }

    @Test
    void rejectsInvalidContentAndMissingMemories() throws Exception {
        for (String body : new String[] {
                "{}", "{", body(" ", "2026-01-10"), body("x".repeat(121), "2026-01-10"),
                body("Walk", "invalid-date"),
                json.writeValueAsString(Map.of("title", "Walk", "story", "x".repeat(10001), "memoryDate", "2026-01-10")),
                json.writeValueAsString(Map.of("title", "Walk", "story", "Story", "memoryDate", "2026-01-10", "locationName", "x".repeat(201))) }) {
            mvc.perform(write(post("/api/memories")).content(body)).andExpect(status().isBadRequest());
        }
        String missing = "/api/memories/" + UUID.randomUUID();
        mvc.perform(get(missing).session(session)).andExpect(status().isNotFound());
        mvc.perform(write(put(missing)).content(updateBody(0))).andExpect(status().isNotFound());
        mvc.perform(write(delete(missing))).andExpect(status().isNotFound());
        mvc.perform(write(put(missing)).content(body("Walk", "2026-01-10"))).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memories", Long.class)).isZero();
    }

    @Test
    void requiresAuthenticationAndCsrfForMemoryOperations() throws Exception {
        String path = "/api/memories/" + create("First walk", "2026-01-10");
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/memories")).andExpect(status().isUnauthorized());
        for (MockHttpServletRequestBuilder request : new MockHttpServletRequestBuilder[] {
                post("/api/memories"), put(path), delete(path) }) {
            mvc.perform(request.session(session).contentType("application/json").content(body("Walk", "2026-01-10")))
                    .andExpect(status().isForbidden());
        }
        MockHttpSession anonymous = new MockHttpSession();
        String anonymousToken = token(anonymous);
        mvc.perform(post("/api/memories").session(anonymous).header("X-CSRF-TOKEN", anonymousToken)
                .contentType("application/json").content(body("Walk", "2026-01-10")))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM capsule.memories", Long.class)).isEqualTo(1);
    }

    private String create(String title, String date) throws Exception {
        var result = mvc.perform(write(post("/api/memories")).content(body(title, date)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.createdAt").exists()).andReturn();
        String id = JsonPath.read(result.getResponse().getContentAsString(), "$.id");
        assertThat(result.getResponse().getHeader("Location")).isEqualTo("/api/memories/" + id);
        return id;
    }

    private String body(String title, String date) {
        return json.writeValueAsString(Map.of("title", title, "story", "A fictional walk together.",
                "memoryDate", date, "locationName", " Stockholm "));
    }

    private String updateBody(long version) {
        return json.writeValueAsString(Map.of("title", "Updated walk", "story", "An updated story.",
                "memoryDate", "2026-01-11", "locationName", "", "version", version));
    }

    private MockHttpServletRequestBuilder write(MockHttpServletRequestBuilder request) {
        return request.session(session).header("X-CSRF-TOKEN", csrf).contentType("application/json");
    }

    private void login(String username) throws Exception {
        session = new MockHttpSession();
        mvc.perform(post("/api/auth/login").session(session).header("X-CSRF-TOKEN", token(session))
                .param("username", username).param("password", "a long test passphrase"))
                .andExpect(status().isNoContent());
        csrf = token(session);
    }

    private String token(MockHttpSession target) throws Exception {
        String result = mvc.perform(get("/api/auth/csrf").session(target)).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(result, "$.token");
    }
}
