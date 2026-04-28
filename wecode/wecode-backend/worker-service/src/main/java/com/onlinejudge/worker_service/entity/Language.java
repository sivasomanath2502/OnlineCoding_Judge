package com.onlinejudge.worker_service.entity;


import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "languages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Language {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 50)
    private String name;           // "C++"

    @Column(nullable = false, length = 20)
    private String version;        // "g++ 13"

    @Column(name = "compile_cmd", nullable = false, columnDefinition = "TEXT")
    private String compileCmd;     // "g++ -o solution solution.cpp"

    @Column(name = "run_cmd", nullable = false, columnDefinition = "TEXT")
    private String runCmd;         // "./solution"

    @Column(name = "docker_image", nullable = false, length = 100)
    private String dockerImage;    // "gcc:latest"
}