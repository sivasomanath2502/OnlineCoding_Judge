package com.onlinejudge.submission_service.messaging;

import com.onlinejudge.submission_service.dto.messaging.JobMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SubmissionPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchange}")
    private String exchange;

    @Value("${rabbitmq.routing.key}")
    private String routingKey;

    public void publishJob(JobMessage jobMessage) {
        log.info("Publishing job to RabbitMQ: submissionId={}",
                jobMessage.getSubmissionId());

        rabbitTemplate.convertAndSend(exchange, routingKey, jobMessage);

        log.info("Job published successfully: submissionId={}",
                jobMessage.getSubmissionId());
    }
}
