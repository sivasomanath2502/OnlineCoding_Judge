package com.onlinejudge.worker_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "problems")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Problem {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;  // ← Change UUID to String

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "time_limit_ms", nullable = false)
    private Integer timeLimitMs;

    @OneToMany(mappedBy = "problem", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @OrderBy("orderIndex ASC")
    private List<TestCase> testCases;
}