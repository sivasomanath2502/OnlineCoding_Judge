package com.onlinejudge.submission_service.repository;


import com.onlinejudge.submission_service.entity.Submission;
import com.onlinejudge.submission_service.entity.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubmissionRepository extends JpaRepository<Submission, UUID> {

    List<Submission> findByUserId(String userId);

    List<Submission> findByStatus(SubmissionStatus status);
}