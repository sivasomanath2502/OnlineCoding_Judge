package com.onlinejudge.admin_service.dto.response;

import com.onlinejudge.admin_service.entity.enums.Difficulty;
import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProblemResponse {

    private String id;
    private String title;
    private String description;
    private Difficulty difficulty;
    private Integer timeLimitMs;
    private Integer testCaseCount;
    private List<TestCaseResponse> testCases;
}