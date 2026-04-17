package com.onlinejudge.api_gateway.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Mono;

@Configuration
public class GatewayConfig {

    // ─── Rate limit key — per user-id header ─────────────────────────
    // Falls back to IP if header not present
    @Bean
    public KeyResolver userKeyResolver() {
        return exchange -> {
            String userId = exchange.getRequest()
                    .getHeaders()
                    .getFirst("X-User-Id");
            if (userId != null && !userId.isBlank()) {
                return Mono.just(userId);
            }
            // fallback to IP
            return Mono.just(
                    exchange.getRequest()
                            .getRemoteAddress()
                            .getAddress()
                            .getHostAddress()
            );
        };
    }

    // ─── Rate limiter: 5 requests/second, burst of 10 ────────────────
    @Bean
    public RedisRateLimiter redisRateLimiter() {
        return new RedisRateLimiter(5, 10);
    }

    @Bean
    public RouteLocator customRouteLocator(
            RouteLocatorBuilder builder,
            RedisRateLimiter rateLimiter,
            KeyResolver keyResolver) {

        return builder.routes()

                // ─── Submission Service ───────────────────────────────
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
                        .uri("http://localhost:8081"))

                // ─── Result Service ───────────────────────────────────
                .route("result-service", r -> r
                        .path("/results/**")
                        .filters(f -> f
                                .addRequestHeader("X-Service", "result-service")
                                .addRequestHeader("X-Gateway-Version", "1.0")
                        )
                        .uri("http://localhost:8083"))

                // ─── Admin Service ────────────────────────────────────
                .route("admin-service", r -> r
                        .path("/admin/**")
                        .filters(f -> f
                                .addRequestHeader("X-Service", "admin-service")
                                .addRequestHeader("X-Gateway-Version", "1.0")
                        )
                        .uri("http://localhost:8084"))

                .build();
    }
}