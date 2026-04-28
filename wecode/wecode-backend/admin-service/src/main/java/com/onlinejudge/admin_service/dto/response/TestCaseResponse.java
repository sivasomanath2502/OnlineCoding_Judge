package com.onlinejudge.admin_service.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TestCaseResponse {

    private String id;
    private String input;
    private String expectedOutput;
    private Integer orderIndex;
}