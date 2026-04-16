package com.onlinejudge.result_service.service;

import com.onlinejudge.result_service.dto.response.ResultResponse;
import com.onlinejudge.result_service.entity.Result;
import com.onlinejudge.result_service.entity.Submission;
import com.onlinejudge.result_service.entity.enums.SubmissionStatus;
import com.onlinejudge.result_service.exception.ResourceNotFoundException;
import com.onlinejudge.result_service.repository.ResultRepository;
import com.onlinejudge.result_service.repository.SubmissionRepository;
import com.onlinejudge.result_service.sse.SseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResultService {

    private final SubmissionRepository submissionRepository;
    private final ResultRepository resultRepository;
    private final SseEmitterRegistry sseEmitterRegistry;

    @Value("${sse.timeout.milliseconds}")
    private Long sseTimeout;

    // ─────────────────────────────────────────────
    // GET RESULT
    // ─────────────────────────────────────────────
    public ResultResponse getResult(String submissionId) {

        log.info("Fetching result for submissionId={}", submissionId);

        if (submissionId == null || submissionId.isBlank()) {
            throw new IllegalArgumentException("submissionId cannot be empty");
        }

        Submission submission = submissionRepository
                .findByUUID(submissionId)
                .orElseThrow(() -> {
                    log.error("Submission NOT FOUND: {}", submissionId);
                    return new ResourceNotFoundException(
                            "Submission not found: " + submissionId);
                });

        log.info("Submission found with status={}", submission.getStatus());

        // If not completed → return status only
        if (submission.getStatus() != SubmissionStatus.COMPLETED
                && submission.getStatus() != SubmissionStatus.FAILED) {

            log.info("Submission not completed yet: {}", submissionId);

            return ResultResponse.builder()
                    .submissionId(submissionId)
                    .status(submission.getStatus())
                    .build();
        }

        // Fetch result
        Optional<Result> resultOpt = resultRepository
                .findBySubmissionId(submissionId);

        if (resultOpt.isEmpty()) {
            log.warn("Submission completed but result missing: {}", submissionId);

            return ResultResponse.builder()
                    .submissionId(submissionId)
                    .status(submission.getStatus())
                    .build();
        }

        Result r = resultOpt.get();

        log.info("Result found for submissionId={}", submissionId);

        return ResultResponse.builder()
                .submissionId(submissionId)
                .status(submission.getStatus())
                .verdict(r.getVerdict())
                .executionMs(r.getExecutionMs())
                .testCasesPassed(r.getTestCasesPassed())
                .testCasesTotal(r.getTestCasesTotal())
                .errorMessage(r.getErrorMessage())
                .build();
    }

    // ─────────────────────────────────────────────
    // SSE STREAM
    // ─────────────────────────────────────────────
    public SseEmitter streamResult(String submissionId) {

        log.info("SSE connection requested for {}", submissionId);

        submissionRepository
                .findByUUID(submissionId)
                .orElseThrow(() -> {
                    log.error("SSE failed - submission not found: {}", submissionId);
                    return new ResourceNotFoundException(
                            "Submission not found: " + submissionId);
                });

        SseEmitter emitter = sseEmitterRegistry
                .register(submissionId, sseTimeout);

        Optional<Result> existing = resultRepository
                .findBySubmissionId(submissionId);

        if (existing.isPresent()) {
            log.info("Sending existing result immediately for {}", submissionId);

            Result r = existing.get();

            ResultResponse response = ResultResponse.builder()
                    .submissionId(submissionId)
                    .status(SubmissionStatus.COMPLETED)
                    .verdict(r.getVerdict())
                    .executionMs(r.getExecutionMs())
                    .testCasesPassed(r.getTestCasesPassed())
                    .testCasesTotal(r.getTestCasesTotal())
                    .errorMessage(r.getErrorMessage())
                    .build();

            sseEmitterRegistry.sendResult(submissionId, response);
        }

        return emitter;
    }

    // ─────────────────────────────────────────────
    // NOTIFY
    // ─────────────────────────────────────────────
    public void notifyResult(String submissionId) {

        log.info("Notify called for submissionId={}", submissionId);

        if (!sseEmitterRegistry.hasEmitter(submissionId)) {
            log.warn("No active SSE client for {}", submissionId);
            return;
        }

        ResultResponse response = getResult(submissionId);

        sseEmitterRegistry.sendResult(submissionId, response);

        log.info("SSE notification sent for {}", submissionId);
    }
}