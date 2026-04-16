package com.onlinejudge.worker_service.dto;

import com.onlinejudge.worker_service.entity.enums.Verdict;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExecutionResult {

    private Verdict verdict;
    private Integer executionMs;
    private Integer testCasesPassed;
    private Integer testCasesTotal;
    private String errorMessage;
}