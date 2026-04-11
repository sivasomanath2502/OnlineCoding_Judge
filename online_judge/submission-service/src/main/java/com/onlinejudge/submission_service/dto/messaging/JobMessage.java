package com.onlinejudge.submission_service.dto.messaging;

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
