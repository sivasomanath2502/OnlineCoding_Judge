package com.onlinejudge.worker_service.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobMessage {

    private String submissionId;  // String not UUID
    private String problemId;     // String not UUID
}