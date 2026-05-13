package com.onlinejudge.api_gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
@Slf4j
public class JwtAuthFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret}")
    private String secretKey;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();

        // 1. Double-check for CORS preflight (OPTIONS)
        if ("OPTIONS".equalsIgnoreCase(method) || 
            request.getHeaders().containsKey("Access-Control-Request-Method")) {
            return chain.filter(exchange);
        }

        // 2. Define Public paths (No Token Required)
        boolean isPublicPath = path.startsWith("/auth/") || path.startsWith("/actuator/");
        boolean isPublicGetProblems = "GET".equalsIgnoreCase(method) && path.startsWith("/admin/problems");
        boolean isPublicStream = "GET".equalsIgnoreCase(method) && path.endsWith("/stream");

        if (isPublicPath || isPublicGetProblems || isPublicStream) {
            return chain.filter(exchange);
        }

        // 3. For all other paths, check Authorization header
        List<String> authHeader = request.getHeaders().get(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || authHeader.isEmpty() || !authHeader.get(0).startsWith("Bearer ")) {
            return onError(exchange, "Missing token", HttpStatus.UNAUTHORIZED);
        }

        String token = authHeader.get(0).substring(7);

        try {
            Claims claims = Jwts.parser()
                    .verifyWith(getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            String userId = claims.get("userId", String.class);
            String email = claims.get("email", String.class);
            String role = claims.get("role", String.class);

            // 4. Role-based check for Admin paths (Non-GET /admin/**)
            if (path.startsWith("/admin/") && !"ROLE_ADMIN".equals(role)) {
                return onError(exchange, "Admin access required", HttpStatus.FORBIDDEN);
            }

            // Forward claims to downstream
            ServerHttpRequest modifiedRequest = request.mutate()
                    .header("X-User-Id", userId)
                    .header("X-User-Email", email)
                    .header("X-User-Role", role)
                    .build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());

        } catch (Exception e) {
            log.error("JWT Validation failed: {}", e.getMessage());
            return onError(exchange, "Invalid or expired token", HttpStatus.UNAUTHORIZED);
        }
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(httpStatus);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        
        String body = "{\"error\":\"" + err + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public int getOrder() {
        return -2;
    }
}