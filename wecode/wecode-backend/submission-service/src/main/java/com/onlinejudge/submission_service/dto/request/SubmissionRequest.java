package com.onlinejudge.submission_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionRequest {

    @NotNull(message = "Problem ID is required")
    private UUID problemId;

    @NotNull(message = "Language ID is required")
    private Integer languageId;

    @NotBlank(message = "User ID is required")
    private String userId;

    @NotBlank(message = "Code cannot be empty")
    private String code;
}
