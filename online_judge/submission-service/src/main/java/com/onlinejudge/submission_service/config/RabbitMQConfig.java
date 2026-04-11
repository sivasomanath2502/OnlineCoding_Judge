package com.onlinejudge.submission_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${rabbitmq.queue.job}")
    private String jobQueueName;

    @Value("${rabbitmq.queue.dlq}")
    private String deadLetterQueueName;

    @Value("${rabbitmq.exchange}")
    private String exchangeName;

    @Value("${rabbitmq.routing.key}")
    private String routingKey;

    // ─── Dead Letter Queue ───────────────────────────────────────────
    // Simple durable queue — no special args needed on DLQ itself
    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder
                .durable(deadLetterQueueName)
                .build();
    }

    // ─── Main Job Queue ──────────────────────────────────────────────
    // When message is rejected 3 times → goes to DLQ directly
    // Using "" (default exchange) so we just need the DLQ name as routing key
    @Bean
    public Queue jobQueue() {
        return QueueBuilder
                .durable(jobQueueName)
                .withArgument("x-dead-letter-exchange", "")  // default exchange
                .withArgument("x-dead-letter-routing-key", deadLetterQueueName)
                .build();
    }

    // ─── Direct Exchange ─────────────────────────────────────────────
    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(exchangeName);
    }

    // ─── Binding: jobQueue → exchange via routingKey ─────────────────
    @Bean
    public Binding jobBinding() {
        return BindingBuilder
                .bind(jobQueue())
                .to(exchange())
                .with(routingKey);
    }

    // ─── JSON Message Converter ──────────────────────────────────────
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // ─── RabbitTemplate ─────────────────────────────────────────────
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}