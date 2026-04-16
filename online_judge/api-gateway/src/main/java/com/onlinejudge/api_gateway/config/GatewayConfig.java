package com.onlinejudge.api_gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()

                // Route 1: Submission Service
                .route("submission-service", r -> r
                        .path("/submissions/**")
                        .uri("http://localhost:8081"))

                // Route 2: Result Service
                .route("result-service", r -> r
                        .path("/results/**")
                        .uri("http://localhost:8083"))

                .build();
    }
}