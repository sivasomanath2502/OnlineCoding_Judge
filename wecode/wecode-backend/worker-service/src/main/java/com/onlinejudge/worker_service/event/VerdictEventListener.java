package com.onlinejudge.worker_service.event;

import com.onlinejudge.worker_service.service.ResultNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
@RequiredArgsConstructor
@Slf4j
public class VerdictEventListener {

    private final ResultNotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleVerdictSaved(VerdictSavedEvent event) {

        notificationService.notifyResultReady(event.submissionId());
    }
}