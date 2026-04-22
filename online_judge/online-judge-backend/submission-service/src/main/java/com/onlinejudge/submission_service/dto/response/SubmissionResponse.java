package com.onlinejudge.submission_service.dto.response;

import com.onlinejudge.submission_service.entity.enums.SubmissionStatus;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionResponse {

    private String submissionId;  // String not UUID
    private SubmissionStatus status;
    private LocalDateTime submittedAt;
    private String message;
}
