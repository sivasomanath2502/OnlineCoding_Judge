package com.onlinejudge.result_service.controller;

import com.onlinejudge.result_service.dto.response.ResultResponse;
import com.onlinejudge.result_service.service.ResultService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/results")
@RequiredArgsConstructor
@Slf4j
public class ResultController {

    private final ResultService resultService;

    @GetMapping("/{submissionId}")
    public ResponseEntity<ResultResponse> getResult(
            @PathVariable("submissionId") String submissionId) {
        return ResponseEntity.ok(resultService.getResult(submissionId));
    }

    @GetMapping(value = "/{submissionId}/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamResult(@PathVariable("submissionId") String submissionId) {
        return resultService.streamResult(submissionId);
    }

    @PostMapping("/internal/notify/{submissionId}")
    public ResponseEntity<Void> notifyVerdict(
            @PathVariable("submissionId") String submissionId) {
        log.info("Received notify request for submissionId={}", submissionId);
        resultService.pushResultToClient(submissionId);
        return ResponseEntity.ok().build();
    }
}