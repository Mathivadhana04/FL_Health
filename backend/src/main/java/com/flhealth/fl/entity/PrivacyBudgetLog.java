package com.flhealth.fl.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "fl_privacy_budget_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrivacyBudgetLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long runId;

    @Column(nullable = false)
    private Integer roundNumber;

    @Column(nullable = false)
    private Double epsilonSpent;

    @Column(nullable = false)
    private Double delta;
}
