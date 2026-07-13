// analytics/controller/AnalyticsController.java
package com.flhealth.analytics.controller;

import com.flhealth.analytics.dto.DashboardMetricsResponse;
import com.flhealth.analytics.service.AnalyticsService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/dashboard")
    public DashboardMetricsResponse getDashboard() {
        return analyticsService.getMetrics();
    }
}