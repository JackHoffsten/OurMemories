package se.jackhoffsten.ourmemories.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
class SecurityConfiguration {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.addFilterBefore(
                        new LoginThrottleFilter(new LoginThrottle()),
                        UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(
                        authorize ->
                                authorize
                                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf")
                                        .permitAll()
                                        .requestMatchers(HttpMethod.POST, "/api/auth/login")
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .requestCache(cache -> cache.disable())
                .exceptionHandling(
                        errors ->
                                errors.authenticationEntryPoint(
                                                (request, response, exception) ->
                                                        response.setStatus(401))
                                        .accessDeniedHandler(
                                                (request, response, exception) ->
                                                        response.setStatus(403)))
                .formLogin(
                        login ->
                                login.loginProcessingUrl("/api/auth/login")
                                        .successHandler(
                                                (request, response, authentication) ->
                                                        response.setStatus(204))
                                        .failureHandler(
                                                (request, response, exception) ->
                                                        response.setStatus(401)))
                .logout(
                        logout ->
                                logout.logoutUrl("/api/auth/logout")
                                        .deleteCookies("JSESSIONID")
                                        .logoutSuccessHandler(
                                                (request, response, authentication) ->
                                                        response.setStatus(204)))
                .sessionManagement(
                        session -> session.sessionFixation(fixation -> fixation.changeSessionId()))
                .build();
    }
}
