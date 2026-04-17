package com.onlinejudge.admin_service.dto.request;

import com.onlinejudge.admin_service.entity.enums.Difficulty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProblemRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Difficulty is required")
    private Difficulty difficulty;

    @Min(value = 500, message = "Time limit must be at least 500ms")
    @Max(value = 10000, message = "Time limit cannot exceed 10000ms")
    private Integer timeLimitMs = 2000;

    @NotNull(message = "Test cases are required")
    @Size(min = 1, max = 10, message = "Must have between 1 and 10 test cases")
    @Valid
    private List<TestCaseRequest> testCases;
}