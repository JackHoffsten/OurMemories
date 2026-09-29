package se.jackhoffsten.ourmemories.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class LoginThrottleTests {
    @Test
    void normalizesNamesAcrossAddressesAndResetsAfterWindow() {
        var clock = new TestClock();
        var throttle = new LoginThrottle(clock);
        for (int i = 0; i < 10; i++)
            assertThat(throttle.acquire("ip" + i, " FIRST.USER ")).isZero();
        assertThat(throttle.acquire("new-ip", "first.user")).isEqualTo(900);
        clock.now = clock.now.plusSeconds(901);
        assertThat(throttle.acquire("new-ip", "first.user")).isZero();
    }

    @Test
    void capsAttemptsFromOneAddressAcrossNames() {
        var throttle = new LoginThrottle();
        for (int i = 0; i < 30; i++) assertThat(throttle.acquire("same-ip", "user" + i)).isZero();
        assertThat(throttle.acquire("same-ip", "another")).isPositive();
        assertThat(throttle.acquire("different-ip", "another")).isZero();
    }

    @Test
    void returnsRetryHeaderAndDoesNotTrustRawForwardedHeader() throws Exception {
        var filter = new LoginThrottleFilter(new LoginThrottle());
        for (int i = 0; i < 31; i++) {
            var request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setServletPath("/api/auth/login");
            request.setRemoteAddr("192.0.2.1");
            request.addHeader("X-Forwarded-For", "spoof" + i);
            request.addParameter("username", "user" + i);
            var response = new MockHttpServletResponse();
            filter.doFilter(
                    request,
                    response,
                    (req, res) -> ((MockHttpServletResponse) res).setStatus(401));
            assertThat(response.getStatus()).isEqualTo(i < 30 ? 401 : 429);
            if (i == 30) {
                assertThat(response.getHeader("Retry-After")).isNotNull();
                assertThat(response.getContentAsString()).contains("inloggningsförsök");
            }
        }
    }

    static class TestClock extends Clock {
        Instant now = Instant.parse("2026-01-01T00:00:00Z");

        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        public Clock withZone(ZoneId zone) {
            return this;
        }

        public Instant instant() {
            return now;
        }
    }
}
