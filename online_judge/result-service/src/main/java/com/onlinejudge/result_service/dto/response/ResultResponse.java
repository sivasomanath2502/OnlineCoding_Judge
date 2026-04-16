package com.onlinejudge.result_service.dto.response;

import com.onlinejudge.result_service.entity.enums.Verdict;
import com.onlinejudge.result_service.entity.enums.SubmissionStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResultResponse {

    private String submissionId;
    private SubmissionStatus status;
    private Verdict verdict;
    private Integer executionMs;
    private Integer testCasesPassed;
    private Integer testCasesTotal;
    private String errorMessage;
}