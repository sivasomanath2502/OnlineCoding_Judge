package com.onlinejudge.worker_service.service;

import com.onlinejudge.worker_service.dto.ExecutionResult;
import com.onlinejudge.worker_service.entity.Result;
import com.onlinejudge.worker_service.entity.Submission;
import com.onlinejudge.worker_service.entity.enums.SubmissionStatus;
import com.onlinejudge.worker_service.repository.ResultRepository;
import com.onlinejudge.worker_service.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerdictService {

    private final ResultRepository resultRepository;
    private final SubmissionRepository submissionRepository;
    private final ResultNotificationService resultNotificationService;

    @Transactional
    public void saveVerdict(Submission submission,
                            ExecutionResult executionResult) {

        log.info("Saving verdict for submissionId={}: verdict={}",
                submission.getId(),
                executionResult.getVerdict());

        // ─── 1. Save result ──────────────────────────────────────────
        Result result = Result.builder()
                .submission(submission)
                .verdict(executionResult.getVerdict())
                .executionMs(executionResult.getExecutionMs())
                .testCasesPassed(executionResult.getTestCasesPassed())
                .testCasesTotal(executionResult.getTestCasesTotal())
                .errorMessage(executionResult.getErrorMessage())
                .build();

        resultRepository.save(result);

        // ─── 2. Update submission status ─────────────────────────────
        submission.setStatus(SubmissionStatus.COMPLETED);
        submissionRepository.save(submission);

        log.info("Verdict saved. submissionId={}, verdict={}",
                submission.getId(),
                executionResult.getVerdict());

        // ─── 3. Notify result-service (SSE / async) ──────────────────
        resultNotificationService.notifyResultReady(submission.getId());
    }

    @Transactional
    public void markFailed(Submission submission, String reason) {

        log.error("Marking submission as FAILED. submissionId={}, reason={}",
                submission.getId(), reason);

        // ─── 1. Update status ────────────────────────────────────────
        submission.setStatus(SubmissionStatus.FAILED);
        submissionRepository.save(submission);

        // ─── 2. Save failure result (optional but recommended) ───────
        Result result = Result.builder()
                .submission(submission)
                .verdict(null) // system failure → no verdict
                .executionMs(0)
                .testCasesPassed(0)
                .testCasesTotal(0)
                .errorMessage(reason)
                .build();

        resultRepository.save(result);

        // ─── 3. Notify UI ────────────────────────────────────────────
        resultNotificationService.notifyResultReady(submission.getId());
    }
}