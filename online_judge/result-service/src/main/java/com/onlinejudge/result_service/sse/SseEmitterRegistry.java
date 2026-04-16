package com.onlinejudge.result_service.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class SseEmitterRegistry {

    // One emitter per submissionId
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    // ─── Register a new SSE connection ───────────────────────────────
    public SseEmitter register(String submissionId, Long timeout) {
        SseEmitter emitter = new SseEmitter(timeout);

        // Clean up on completion/timeout/error
        emitter.onCompletion(() -> {
            emitters.remove(submissionId);
            log.info("SSE completed for submissionId={}", submissionId);
        });
        emitter.onTimeout(() -> {
            emitters.remove(submissionId);
            log.info("SSE timed out for submissionId={}", submissionId);
        });
        emitter.onError(e -> {
            emitters.remove(submissionId);
            log.warn("SSE error for submissionId={}: {}", submissionId, e.getMessage());
        });

        emitters.put(submissionId, emitter);
        log.info("SSE registered for submissionId={}", submissionId);
        return emitter;
    }

    // ─── Push result to a waiting client ─────────────────────────────
    public void sendResult(String submissionId, Object data) {
        SseEmitter emitter = emitters.get(submissionId);
        if (emitter == null) {
            log.debug("No SSE emitter found for submissionId={}", submissionId);
            return;
        }

        try {
            emitter.send(SseEmitter.event()
                    .name("result")
                    .data(data));
            emitter.complete();
            log.info("SSE result sent for submissionId={}", submissionId);
        } catch (Exception e) {
            log.error("Failed to send SSE for submissionId={}: {}",
                    submissionId, e.getMessage());
            emitter.completeWithError(e);
        } finally {
            emitters.remove(submissionId);
        }
    }

    // ─── Check if client is waiting ───────────────────────────────────
    public boolean hasEmitter(String submissionId) {
        return emitters.containsKey(submissionId);
    }
}