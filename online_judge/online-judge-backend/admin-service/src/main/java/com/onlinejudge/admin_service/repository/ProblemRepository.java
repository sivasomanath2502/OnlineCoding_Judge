package com.onlinejudge.admin_service.repository;

import com.onlinejudge.admin_service.entity.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProblemRepository extends JpaRepository<Problem, String> {

    @Query(value = "SELECT * FROM problems WHERE id = :id", nativeQuery = true)
    Optional<Problem> findByUUID(@Param("id") String id);
}