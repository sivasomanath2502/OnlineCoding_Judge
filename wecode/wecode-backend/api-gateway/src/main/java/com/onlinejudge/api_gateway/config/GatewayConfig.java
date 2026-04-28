package com.onlinejudge.api_gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Mono;

@Configuration
public class GatewayConfig {

    // ─── Inject URLs from properties ─────────────────────────
    @Value("${submission.service.url}")
    private String submissionServiceUrl;

    @Value("${result.service.url}")
    private String resultServiceUrl;

    @Value("${admin.service.url}")
    private String adminServiceUrl;

    // ─── Rate limit key ─────────────────────────
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String userId = exchange.getRequest()
                    .getHeaders()
                    .getFirst("X-User-Id");

            if (userId != null && !userId.isBlank()) {
                return Mono.just(userId);
            }

            return Mono.just(
                    exchange.getRequest()
                            .getRemoteAddress()
                            .getAddress()
                            .getHostAddress()
            );
        };
    }

    // ─── Rate limiter ─────────────────────────
    @Bean
    public RedisRateLimiter redisRateLimiter() {
        return new RedisRateLimiter(5, 10);
    }

    // ─── Routes ─────────────────────────
    @Bean
    public RouteLocator customRouteLocator(
            RouteLocatorBuilder builder,
            RedisRateLimiter rateLimiter,
            KeyResolver keyResolver) {

        return builder.routes()

                // ─── Submission Service ─────────────────────────
                .route("submission-service", r -> r
                        .path("/submissions/**")
                        .filters(f -> f
                                .addRequestHeader("X-Service", "submission-service")
                                .addRequestHeader("X-Gateway-Version", "1.0")
                                .requestRateLimiter(config -> config
                                        .setRateLimiter(rateLimiter)
                                        .setKeyResolver(keyResolver)
                                        .setDenyEmptyKey(false)
                                        .setStatusCode(HttpStatus.TOO_MANY_REQUESTS))
                        )
                        .uri(submissionServiceUrl))

                // ─── Result Service ─────────────────────────
                .route("result-service", r -> r
                        .path("/results/**")
                        .filters(f -> f
                                .addRequestHeader("X-Service", "result-service")
                                .addRequestHeader("X-Gateway-Version", "1.0")
                        )
                        .uri(resultServiceUrl))

                // ─── Admin Service ─────────────────────────
                .route("admin-service", r -> r
                        .path("/admin/**")
                        .filters(f -> f
                                .addRequestHeader("X-Service", "admin-service")
                                .addRequestHeader("X-Gateway-Version", "1.0")
                        )
                        .uri(adminServiceUrl))

                .build();
    }
}