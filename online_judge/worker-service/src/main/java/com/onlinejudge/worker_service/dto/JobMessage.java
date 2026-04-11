package com.onlinejudge.worker_service.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobMessage {

    private UUID submissionId;
    private UUID problemId;
}
