package com.flhealth.fl.repository;

import com.flhealth.fl.entity.PrivacyBudgetLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PrivacyBudgetLogRepository extends JpaRepository<PrivacyBudgetLog, Long> {
    List<PrivacyBudgetLog> findByRunIdOrderByRoundNumberAsc(Long runId);
}
