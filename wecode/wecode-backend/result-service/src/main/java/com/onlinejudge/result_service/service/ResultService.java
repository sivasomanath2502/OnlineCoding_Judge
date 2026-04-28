package com.onlinejudge.result_service.service;

import com.onlinejudge.result_service.dto.response.ResultResponse;
import com.onlinejudge.result_service.entity.Result;
import com.onlinejudge.result_service.entity.Submission;
import com.onlinejudge.result_service.exception.ResourceNotFoundException;
import com.onlinejudge.result_service.repository.ResultRepository;
import com.onlinejudge.result_service.repository.SubmissionRepository;
import com.onlinejudge.result_service.sse.SseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    @Transactional(readOnly = true)
    public ResultResponse getResult(String submissionId) {

        Submission submission = submissionRepository
                .findByUUID(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Submission not found: " + submissionId));

        Optional<Result> resultOpt = resultRepository
                .findBySubmissionId(submissionId);

        return resultOpt.map(this::mapToResponse)
                .orElseGet(() -> ResultResponse.builder()
                        .submissionId(submissionId)
                        .status(submission.getStatus())
                        .build());
    }

    @Transactional(readOnly = true)
    public SseEmitter streamResult(String submissionId) {

        submissionRepository.findByUUID(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Submission not found: " + submissionId));

        SseEmitter emitter = sseEmitterRegistry.register(submissionId, sseTimeout);

        // Send immediately if result already exists
        resultRepository.findBySubmissionId(submissionId)
                .ifPresent(r -> {
                    log.info("Result already exists for {}, sending immediately",
                            submissionId);
                    sseEmitterRegistry.sendResult(submissionId, mapToResponse(r));
                });

        return emitter;
    }

    @Transactional(readOnly = true)
    public void pushResultToClient(String submissionId) {
        log.info("Push result to SSE client for submissionId={}", submissionId);
        try {
            ResultResponse response = getResult(submissionId);
            log.info("Result fetched for {}: verdict={}", submissionId,
                    response.getVerdict());
            sseEmitterRegistry.sendResult(submissionId, response);
        } catch (Exception e) {
            log.error("Failed to push result for submissionId={}: {}",
                    submissionId, e.getMessage(), e);
            throw e;
        }
    }

    private ResultResponse mapToResponse(Result r) {
        Submission sub = r.getSubmission();
        return ResultResponse.builder()
                .submissionId(sub.getId())
                .status(sub.getStatus())
                .verdict(r.getVerdict())
                .executionMs(r.getExecutionMs())
                .testCasesPassed(r.getTestCasesPassed())
                .testCasesTotal(r.getTestCasesTotal())
                .errorMessage(r.getErrorMessage())
                .build();
    }
}