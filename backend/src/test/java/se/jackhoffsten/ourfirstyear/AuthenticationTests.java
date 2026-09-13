package se.jackhoffsten.ourfirstyear;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import se.jackhoffsten.ourfirstyear.account.AccountProvisioningService;
import se.jackhoffsten.ourfirstyear.account.AccountSlot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthenticationTests {
    @Container
    @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18.3-alpine");

    @Autowired MockMvc mvc;
    @Autowired AccountProvisioningService accounts;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void provisionAccount() {
        jdbc.update("DELETE FROM capsule.accounts");
        accounts.provision("first.user", AccountSlot.FIRST, "a long test passphrase".toCharArray());
    }

    @Test
    void protectsAnonymousRequestsWithoutRedirects() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/memories")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate"))
                .andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"));
    }

    @Test
    void requiresCsrfForLogin() throws Exception {
        mvc.perform(post("/api/auth/login").param("username", "first.user")
                .param("password", "a long test passphrase")).andExpect(status().isForbidden());
        MockHttpSession session = new MockHttpSession();
        token(session);
        mvc.perform(post("/api/auth/login").session(session).header("X-CSRF-TOKEN", "invalid")
                .param("username", "first.user").param("password", "a long test passphrase"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsWrongAndUnknownCredentialsIdentically() throws Exception {
        MockHttpSession session = new MockHttpSession();
        String csrf = token(session);
        for (String username : new String[] { "first.user", "unknown.user" }) {
            mvc.perform(post("/api/auth/login").session(session).header("X-CSRF-TOKEN", csrf)
                    .param("username", username).param("password", "incorrect password"))
                    .andExpect(status().isUnauthorized()).andExpect(content().string(""));
        }
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void rotatesSessionAndCsrfOnLoginAndInvalidatesOnLogout() throws Exception {
        MockHttpSession session = new MockHttpSession();
        String oldId = session.getId();
        String csrf = token(session);
        mvc.perform(post("/api/auth/login").session(session).header("X-CSRF-TOKEN", csrf)
                .param("username", " FIRST.USER ").param("password", "a long test passphrase"))
                .andExpect(status().isNoContent());
        assertThat(session.getId()).isNotEqualTo(oldId);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk())
                .andExpect(content().json("{\"username\":\"first.user\"}"));
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", csrf))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/logout").session(session).header("X-CSRF-TOKEN", token(session)))
                .andExpect(status().isNoContent()).andExpect(cookie().maxAge("JSESSIONID", 0));
        assertThat(session.isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    private String token(MockHttpSession session) throws Exception {
        String json = mvc.perform(get("/api/auth/csrf").session(session))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.token");
    }
}
