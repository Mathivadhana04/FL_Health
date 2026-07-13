package com.flhealth.fl.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "fl_self_healing_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelfHealingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long runId;

    @Column(nullable = false)
    private Integer roundNumber;

    private Integer clientId;

    @Column(nullable = false)
    private String eventType; // quarantine, rollback_triggered, checkpoint, etc.

    @Lob
    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
