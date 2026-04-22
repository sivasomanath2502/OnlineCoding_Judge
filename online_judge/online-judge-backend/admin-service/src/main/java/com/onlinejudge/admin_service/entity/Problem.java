package com.onlinejudge.admin_service.entity;

import com.onlinejudge.admin_service.entity.enums.Difficulty;
import jakarta.persistence.*;
import lombok.*;
import java.util.List;

@Entity
@Table(name = "problems")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Problem {

    @Id
    @Column(name = "id", updatable = false, nullable = false, length = 36)
    private String id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Difficulty difficulty;

    @Column(name = "time_limit_ms", nullable = false)
    private Integer timeLimitMs;

    @OneToMany(mappedBy = "problem",
            cascade = CascadeType.ALL,
            fetch = FetchType.LAZY)
    @OrderBy("orderIndex ASC")
    private List<TestCase> testCases;

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = java.util.UUID.randomUUID().toString();
        }
        if (timeLimitMs == null) {
            timeLimitMs = 2000;
        }
    }
}