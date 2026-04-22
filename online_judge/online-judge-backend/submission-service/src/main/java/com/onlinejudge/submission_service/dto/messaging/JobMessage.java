package com.onlinejudge.submission_service.dto.messaging;

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
