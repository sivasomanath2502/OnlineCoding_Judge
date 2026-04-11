package com.onlinejudge.submission_service.service;

import com.onlinejudge.submission_service.dto.messaging.JobMessage;
import com.onlinejudge.submission_service.dto.request.SubmissionRequest;
import com.onlinejudge.submission_service.dto.response.SubmissionResponse;
import com.onlinejudge.submission_service.entity.Language;
import com.onlinejudge.submission_service.entity.Problem;
import com.onlinejudge.submission_service.entity.Submission;
import com.onlinejudge.submission_service.entity.enums.SubmissionStatus;
import com.onlinejudge.submission_service.exception.InvalidSubmissionException;
import com.onlinejudge.submission_service.exception.ResourceNotFoundException;
import com.onlinejudge.submission_service.messaging.SubmissionPublisher;
import com.onlinejudge.submission_service.repository.LanguageRepository;
import com.onlinejudge.submission_service.repository.ProblemRepository;
import com.onlinejudge.submission_service.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final ProblemRepository problemRepository;
    private final LanguageRepository languageRepository;
    private final SubmissionPublisher submissionPublisher;

    @Transactional
    public SubmissionResponse submit(SubmissionRequest request) {

        log.info("New submission received: problemId={}, userId={}",
                request.getProblemId(), request.getUserId());

        // ─── 1. Validate Problem exists ──────────────────────────────
        Problem problem = problemRepository
                .findById(request.getProblemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Problem not found with id: " + request.getProblemId()));

        // ─── 2. Validate Language exists ─────────────────────────────
        Language language = languageRepository
                .findById(request.getLanguageId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language not found with id: " + request.getLanguageId()));

        // ─── 3. Validate code is not blank ───────────────────────────
        if (request.getCode().isBlank()) {
            throw new InvalidSubmissionException("Code cannot be empty");
        }

        // ─── 4. Save submission with PENDING status ──────────────────
        Submission submission = Submission.builder()
                .problem(problem)
                .language(language)
                .userId(request.getUserId())
                .code(request.getCode())
                .status(SubmissionStatus.PENDING)
                .build();

        Submission saved = submissionRepository.save(submission);

        log.info("Submission saved to DB: submissionId={}", saved.getId());

        // ─── 5. Publish job to RabbitMQ ──────────────────────────────
        JobMessage jobMessage = JobMessage.builder()
                .submissionId(saved.getId())
                .problemId(problem.getId())
                .build();

        submissionPublisher.publishJob(jobMessage);

        // ─── 6. Return immediately — do not wait for execution ───────
        return SubmissionResponse.builder()
                .submissionId(saved.getId())
                .status(saved.getStatus())
                .submittedAt(saved.getSubmittedAt())
                .message("Submission received. Poll /results/"
                        + saved.getId() + " for verdict.")
                .build();
    }

    public SubmissionResponse getStatus(UUID submissionId) {

        Submission submission = submissionRepository
                .findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Submission not found with id: " + submissionId));

        return SubmissionResponse.builder()
                .submissionId(submission.getId())
                .status(submission.getStatus())
                .submittedAt(submission.getSubmittedAt())
                .build();
    }
}