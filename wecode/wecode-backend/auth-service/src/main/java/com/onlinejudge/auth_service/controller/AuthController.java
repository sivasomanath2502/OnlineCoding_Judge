package com.onlinejudge.auth_service.controller;

import com.onlinejudge.auth_service.service.AuthService;
import com.onlinejudge.auth_service.service.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        log.info("Health check endpoint called");
        return ResponseEntity.ok("auth-service UP");
    }

    @GetMapping("/google")
    public void googleAuth(HttpServletResponse response) throws IOException {
        log.info("Redirecting to Google Auth URL");
        String url = authService.buildGoogleAuthUrl();
        response.sendRedirect(url);
    }

    @GetMapping("/google/callback")
    public void googleCallback(@RequestParam("code") String code, HttpServletResponse response) throws IOException {
        log.info("Received Google callback");
        String token = authService.processGoogleCallback(code);
        
        // Extract role to append it to redirect URL
        Claims claims = jwtService.extractAllClaims(token);
        String role = claims.get("role", String.class);
        
        // Redirect to frontend - ensure we don't get double slashes if frontendUrl is "/"
        String path = "/login/callback?token=" + token + "&role=" + role;
        String redirectUrl = (frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl) + path;
        log.info("Redirecting to frontend auth callback: {}", redirectUrl);
        response.sendRedirect(redirectUrl);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestHeader("Authorization") String authHeader) {
        log.info("Get user profile called");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.error("Missing or invalid Authorization header");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Missing token"));
        }

        String token = authHeader.substring(7);
        if (!jwtService.isTokenValid(token)) {
            log.error("Invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired token"));
        }

        Claims claims = jwtService.extractAllClaims(token);
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("userId", claims.get("userId"));
        userInfo.put("email", claims.get("email"));
        userInfo.put("name", claims.get("name"));
        userInfo.put("picture", claims.get("picture"));
        userInfo.put("role", claims.get("role"));

        return ResponseEntity.ok(userInfo);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        log.info("Logout called");
        return ResponseEntity.ok().build();
    }
}