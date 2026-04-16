package com.onlinejudge.result_service.controller;

import com.onlinejudge.result_service.dto.response.ResultResponse;
import com.onlinejudge.result_service.service.ResultService;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/results")
@RequiredArgsConstructor
@Slf4j
public class ResultController {

    private final ResultService resultService;

    // ─────────────────────────────────────────────────────────────
    // GET RESULT (Polling)
    // ─────────────────────────────────────────────────────────────
    @GetMapping("/{submissionId}")
    public ResponseEntity<ResultResponse> getResult(
            @Parameter(description = "Submission ID", required = true)
            @PathVariable("submissionId") @NotBlank String submissionId) {

        log.info("GET /results/{} called", submissionId);

        ResultResponse response = resultService.getResult(submissionId);

        return ResponseEntity.ok(response);
    }

    // ─────────────────────────────────────────────────────────────
    // SSE STREAM
    // ─────────────────────────────────────────────────────────────
    @GetMapping(value = "/{submissionId}/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamResult(
            @Parameter(description = "Submission ID", required = true)
            @PathVariable("submissionId") String submissionId) {

        log.info("SSE connected for submissionId={}", submissionId);

        return resultService.streamResult(submissionId);
    }

    // ─────────────────────────────────────────────────────────────
    // NOTIFY (Worker → Result Service)
    // ─────────────────────────────────────────────────────────────
    @PostMapping("/{submissionId}/notify")
    public ResponseEntity<Void> notifyResult(
            @Parameter(description = "Submission ID", required = true)
            @PathVariable("submissionId") String submissionId) {

        log.info("Notify received for submissionId={}", submissionId);

        resultService.notifyResult(submissionId);

        return ResponseEntity.ok().build();
    }
}