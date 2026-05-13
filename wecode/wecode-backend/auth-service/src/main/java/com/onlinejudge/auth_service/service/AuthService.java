package com.onlinejudge.auth_service.service;

import com.onlinejudge.auth_service.dto.GoogleTokenResponse;
import com.onlinejudge.auth_service.dto.GoogleUserInfo;
import com.onlinejudge.auth_service.entity.User;
import com.onlinejudge.auth_service.entity.enums.Role;
import com.onlinejudge.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final WebClient webClient = WebClient.create();

    @Value("${google.client-id}")
    private String clientId;

    @Value("${google.client-secret}")
    private String clientSecret;

    @Value("${google.redirect-uri}")
    private String redirectUri;

    @Value("${app.admin-email}")
    private String adminEmail;

    public String buildGoogleAuthUrl() {
        log.info("Building Google Auth URL");
        return "https://accounts.google.com/o/oauth2/v2/auth" +
                "?client_id=" + clientId +
                "&redirect_uri=" + redirectUri +
                "&response_type=code" +
                "&scope=openid email profile";
    }

    public String processGoogleCallback(String code) {
        log.info("Processing Google Callback with code");

        // 1. Exchange code for token
        GoogleTokenResponse tokenResponse = webClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .body(BodyInserters.fromFormData("code", code)
                        .with("client_id", clientId)
                        .with("client_secret", clientSecret)
                        .with("redirect_uri", redirectUri)
                        .with("grant_type", "authorization_code"))
                .retrieve()
                .bodyToMono(GoogleTokenResponse.class)
                .block();

        if (tokenResponse == null || tokenResponse.getAccessToken() == null) {
            log.error("Failed to retrieve access token from Google");
            throw new RuntimeException("Failed to retrieve access token from Google");
        }

        // 2. Fetch user profile
        GoogleUserInfo userInfo = webClient.get()
                .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                .header("Authorization", "Bearer " + tokenResponse.getAccessToken())
                .retrieve()
                .bodyToMono(GoogleUserInfo.class)
                .block();

        if (userInfo == null) {
            log.error("Failed to retrieve user info from Google");
            throw new RuntimeException("Failed to retrieve user info from Google");
        }

        log.info("Successfully fetched user info for email: {}", userInfo.getEmail());

        // 3. Upsert user in DB
        User user = userRepository.findByEmail(userInfo.getEmail()).orElseGet(() -> {
            log.info("Creating new user for email: {}", userInfo.getEmail());
            User newUser = User.builder()
                    .email(userInfo.getEmail())
                    .googleId(userInfo.getSub())
                    .build();
            return newUser;
        });

        // Update fields that might have changed
        user.setName(userInfo.getName());
        user.setPicture(userInfo.getPicture());
        user.setLastLogin(LocalDateTime.now());
        
        // Ensure googleId is set
        if (user.getGoogleId() == null) {
            user.setGoogleId(userInfo.getSub());
        }

        // Set Role based on admin email property
        Role targetRole = adminEmail.equalsIgnoreCase(userInfo.getEmail()) ? Role.ROLE_ADMIN : Role.ROLE_USER;
        user.setRole(targetRole);

        userRepository.save(user);

        // 4. Generate JWT
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getName(), user.getPicture(), user.getRole().name());
        
        return token;
    }
}