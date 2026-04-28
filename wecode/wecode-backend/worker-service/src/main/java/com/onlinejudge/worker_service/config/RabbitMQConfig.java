package com.onlinejudge.worker_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
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
    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder
                .durable(deadLetterQueueName)
                .build();
    }

    // ─── Main Job Queue ──────────────────────────────────────────────
    @Bean
    public Queue jobQueue() {
        return QueueBuilder
                .durable(jobQueueName)
                .withArgument("x-dead-letter-exchange", "")
                .withArgument("x-dead-letter-routing-key", deadLetterQueueName)
                .build();
    }

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(exchangeName);
    }

    @Bean
    public Binding jobBinding() {
        return BindingBuilder
                .bind(jobQueue())
                .to(exchange())
                .with(routingKey);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}