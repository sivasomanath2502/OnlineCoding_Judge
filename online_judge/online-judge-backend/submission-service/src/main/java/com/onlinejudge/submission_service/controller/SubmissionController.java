package com.onlinejudge.submission_service.controller;

import com.onlinejudge.submission_service.dto.request.SubmissionRequest;
import com.onlinejudge.submission_service.dto.response.SubmissionResponse;
import com.onlinejudge.submission_service.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/submissions")
@RequiredArgsConstructor
@Slf4j
public class SubmissionController {

    private final SubmissionService submissionService;

    // ─── POST /submissions ────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<SubmissionResponse> submit(
            @Valid @RequestBody SubmissionRequest request) {

        log.info("POST /submissions called for userId={}", request.getUserId());

        SubmissionResponse response = submissionService.submit(request);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    // ─── GET /submissions/{id}/status ────────────────────────────────
    @GetMapping("/{submissionId}/status")
    public ResponseEntity<SubmissionResponse> getStatus(
            @PathVariable UUID submissionId) {

        log.info("GET /submissions/{}/status called", submissionId);

        SubmissionResponse response = submissionService.getStatus(submissionId);

        return ResponseEntity.ok(response);
    }
}
