package com.onlinejudge.worker_service.service;

import com.onlinejudge.worker_service.dto.ExecutionResult;
import com.onlinejudge.worker_service.entity.Result;
import com.onlinejudge.worker_service.entity.Submission;
import com.onlinejudge.worker_service.entity.enums.SubmissionStatus;
import com.onlinejudge.worker_service.event.VerdictSavedEvent;
import com.onlinejudge.worker_service.repository.ResultRepository;
import com.onlinejudge.worker_service.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class VerdictService {

    private final ResultRepository resultRepository;
    private final SubmissionRepository submissionRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void saveVerdict(Submission submission,
                            ExecutionResult executionResult) {

        Result result = Result.builder()
                .submission(submission)
                .verdict(executionResult.getVerdict())
                .executionMs(executionResult.getExecutionMs())
                .testCasesPassed(executionResult.getTestCasesPassed())
                .testCasesTotal(executionResult.getTestCasesTotal())
                .errorMessage(executionResult.getErrorMessage())
                .build();

        resultRepository.save(result);

        submission.setStatus(SubmissionStatus.COMPLETED);
        submissionRepository.save(submission);

        eventPublisher.publishEvent(
                new VerdictSavedEvent(submission.getId())
        );
    }

    @Transactional
    public void markFailed(Submission submission, String reason) {

        submission.setStatus(SubmissionStatus.FAILED);
        submissionRepository.save(submission);

        Result result = Result.builder()
                .submission(submission)
                .executionMs(0)
                .testCasesPassed(0)
                .testCasesTotal(0)
                .errorMessage(reason)
                .build();

        resultRepository.save(result);

        eventPublisher.publishEvent(
                new VerdictSavedEvent(submission.getId())
        );
    }
}