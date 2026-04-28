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
import jakarta.persistence.EntityManager;
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
    private final EntityManager entityManager;

    @Transactional
    public SubmissionResponse submit(SubmissionRequest request) {

        log.info("Step 1: Looking up problem");
        Problem problem = problemRepository
                .findByUUID(request.getProblemId().toString())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Problem not found: " + request.getProblemId()));
        log.info("Step 2: Problem found - {}", problem.getTitle());
        log.info("Problem ID from DB: '{}'", problem.getId());
        log.info("Problem ID length: {}",
                problem.getId() != null ? problem.getId().toString().length() : "NULL");

        log.info("Step 3: Looking up language");
        Language language = languageRepository
                .findById(request.getLanguageId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Language not found: " + request.getLanguageId()));
        log.info("Step 4: Language found - {}", language.getName());

        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new InvalidSubmissionException("Code cannot be empty");
        }

        log.info("Step 5: Building submission object");
        Submission submission = Submission.builder()
                .problem(problem)
                .language(language)
                .userId(request.getUserId())
                .code(request.getCode())
                .status(SubmissionStatus.PENDING)
                .build();

        log.info("Step 6: Saving submission");
        Submission saved = submissionRepository.save(submission);

        log.info("Step 7: Flushing to DB");
        log.info("Step 7: Flushing to DB - submission id={}, problem_id={}, language_id={}",
                submission.getId(),
                submission.getProblem().getId(),
                submission.getLanguage().getId());
        entityManager.flush();
        entityManager.flush();

        log.info("Step 8: Publishing to RabbitMQ");
        JobMessage jobMessage = JobMessage.builder()
                .submissionId(saved.getId().toString())
                .problemId(problem.getId().toString())
                .build();

        submissionPublisher.publishJob(jobMessage);

        log.info("Step 9: Returning response");
        return SubmissionResponse.builder()
                .submissionId(saved.getId())  // now String directly
                .status(saved.getStatus())
                .submittedAt(saved.getSubmittedAt())
                .message("Submission received. Poll /results/"
                        + saved.getId() + " for verdict.")
                .build();
    }

    public SubmissionResponse getStatus(UUID submissionId) {
        Submission submission = submissionRepository
                .findByUUID(submissionId.toString())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Submission not found: " + submissionId));

        return SubmissionResponse.builder()
                .submissionId(submission.getId())
                .status(submission.getStatus())
                .submittedAt(submission.getSubmittedAt())
                .build();
    }
}