package com.flhealth.fl.repository;

import com.flhealth.fl.entity.SelfHealingEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SelfHealingEventRepository extends JpaRepository<SelfHealingEvent, Long> {
    List<SelfHealingEvent> findByRunIdOrderByRoundNumberAscTimestampAsc(Long runId);
}
