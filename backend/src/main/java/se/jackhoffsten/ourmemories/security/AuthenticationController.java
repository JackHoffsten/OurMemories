package se.jackhoffsten.ourmemories.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
class AuthenticationController {
    @GetMapping("/csrf")
    CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @GetMapping("/me")
    SessionResponse me(Authentication authentication) {
        return new SessionResponse(authentication.getName());
    }

    record CsrfResponse(String headerName, String token) {}

    record SessionResponse(String username) {}
}
