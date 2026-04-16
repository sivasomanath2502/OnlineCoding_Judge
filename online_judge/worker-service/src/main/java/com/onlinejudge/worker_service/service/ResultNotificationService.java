package com.onlinejudge.worker_service.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class ResultNotificationService {

    private final RestTemplate restTemplate;

    @Value("${result.service.url}")
    private String resultServiceUrl;

    public ResultNotificationService() {
        this.restTemplate = new RestTemplate();
    }

    public void notifyResultReady(String submissionId) {
        try {
            String url = resultServiceUrl + "/results/"
                    + submissionId + "/notify";
            restTemplate.postForEntity(url, null, Void.class);
            log.info("Notified result-service for submissionId={}", submissionId);
        } catch (Exception e) {
            // Non-critical — SSE just won't fire, client can still poll
            log.warn("Could not notify result-service for submissionId={}: {}",
                    submissionId, e.getMessage());
        }
    }
}