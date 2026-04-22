package com.onlinejudge.worker_service.consumer;

import com.onlinejudge.worker_service.dto.JobMessage;
import com.onlinejudge.worker_service.dto.ExecutionResult;
import com.onlinejudge.worker_service.entity.Submission;
import com.onlinejudge.worker_service.entity.TestCase;
import com.onlinejudge.worker_service.entity.enums.SubmissionStatus;
import com.onlinejudge.worker_service.exception.ExecutionException;
import com.onlinejudge.worker_service.repository.SubmissionRepository;
import com.onlinejudge.worker_service.service.ExecutionService;
import com.onlinejudge.worker_service.service.VerdictService;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class JobConsumer {

    private final SubmissionRepository submissionRepository;
    private final ExecutionService executionService;
    private final VerdictService verdictService;

    @RabbitListener(queues = "${rabbitmq.queue.job}")
    public void consumeJob(
            JobMessage jobMessage,
            Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag)
            throws IOException {

        log.info("Job received: submissionId={}",
                jobMessage.getSubmissionId());

        Submission submission = null;

        try {
            // ─── 1. Fetch submission ──────────────────────────────────
            // ─── 1. Fetch submission with retry ──────────────────────────
            submission = fetchSubmissionWithRetry(jobMessage.getSubmissionId());

            // ─── 2. Mark RUNNING ──────────────────────────────────────
            submission.setStatus(SubmissionStatus.RUNNING);
            submissionRepository.save(submission);

            // ─── 3. Get test cases ────────────────────────────────────
            List<TestCase> testCases = submission
                    .getProblem()
                    .getTestCases();

            if (testCases == null || testCases.isEmpty()) {
                throw new ExecutionException("No test cases found");
            }

            // ─── 4. Execute ───────────────────────────────────────────
            ExecutionResult result = executionService
                    .execute(submission, testCases);

            // ─── 5. Save verdict ──────────────────────────────────────
            verdictService.saveVerdict(submission, result);

            // ─── 6. ACK — job done successfully ──────────────────────
            channel.basicAck(deliveryTag, false);

            log.info("Job ACKed: submissionId={}, verdict={}",
                    submission.getId(), result.getVerdict());

        } catch (Exception e) {
            log.error("Job failed: submissionId={}, error={}",
                    jobMessage.getSubmissionId(), e.getMessage(), e);

            if (submission != null) {
                verdictService.markFailed(submission, e.getMessage());
            }

            // NACK — requeue=false sends to DLQ after max retries
            channel.basicNack(deliveryTag, false, false);
        }
    }
    private Submission fetchSubmissionWithRetry(String submissionId)
            throws InterruptedException {
        int maxRetries = 3;
        int delayMs = 500;

        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            Optional<Submission> result = submissionRepository
                    .findByUUID(submissionId);

            if (result.isPresent()) {
                return result.get();
            }

            log.warn("Submission not found on attempt {}/{}: {}",
                    attempt, maxRetries, submissionId);

            if (attempt < maxRetries) {
                Thread.sleep(delayMs);
            }
        }
        throw new ExecutionException(
                "Submission not found after " + maxRetries
                        + " attempts: " + submissionId);
    }
}