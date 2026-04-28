package com.onlinejudge.result_service.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class SseEmitterRegistry {

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(String submissionId, Long timeout) {

        SseEmitter emitter = new SseEmitter(timeout);

        emitter.onCompletion(() -> cleanup(submissionId));
        emitter.onTimeout(() -> cleanup(submissionId));
        emitter.onError(e -> cleanup(submissionId));

        emitters.put(submissionId, emitter);

        return emitter;
    }

    public void sendResult(String submissionId, Object data) {

        SseEmitter emitter = emitters.get(submissionId);

        if (emitter == null) {
            log.debug("No SSE client for {}", submissionId);
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name("result")
                    .data(data));

            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        } finally {
            cleanup(submissionId);
        }
    }

    private void cleanup(String submissionId) {
        emitters.remove(submissionId);
    }
}