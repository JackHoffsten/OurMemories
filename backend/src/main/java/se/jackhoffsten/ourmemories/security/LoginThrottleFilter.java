package se.jackhoffsten.ourmemories.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

final class LoginThrottleFilter extends OncePerRequestFilter {
    private final LoginThrottle throttle;

    LoginThrottleFilter(LoginThrottle throttle) {
        this.throttle = throttle;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getMethod().equals("POST")
                && request.getServletPath().equals("/api/auth/login")) {
            long retry =
                    throttle.acquire(request.getRemoteAddr(), request.getParameter("username"));
            if (retry > 0) {
                response.setStatus(429);
                response.setHeader("Retry-After", Long.toString(retry));
                response.setHeader("Cache-Control", "no-store");
                response.setContentType("application/problem+json;charset=UTF-8");
                response.getWriter()
                        .write(
                                "{\"status\":429,\"title\":\"För många inloggningsförsök. Vänta en stund och försök igen.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
